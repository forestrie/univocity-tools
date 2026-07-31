import { afterEach, describe, expect, test } from "bun:test";
import {
  concat,
  encodeAbiParameters,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { DEFAULT_SAFE_TX_SERVICE_URL } from "../deploy-constants.js";
import {
  buildSafeTxFields,
  computeSafeTxHash,
  fetchSafeTransaction,
  NULL_ADDRESS,
  packSafeSignatures,
  postSafeTransaction,
  SafeProposalRejectedError,
  SafeServiceError,
  SafeServiceUnavailableError,
  waitForSafeConfirmations,
  type SafeConfirmation,
} from "../safe-client.js";

const CHAIN_ID = 84532;
const SAFE: Address = "0x1528b86ff561f617602356efdbD05908a07AA788";
const CREATE_CALL: Address = "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4";
const SENDER: Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Vendored from safe-contracts v1.4.1 (Safe.sol): the typehash constants the
// deployed Safe commits to on-chain. computeSafeTxHash must reproduce the
// contract's digest exactly or signatures will not verify.
const DOMAIN_SEPARATOR_TYPEHASH =
  "0x47e79534a245952e8b16893a336b85a3d9ea9fa8c573f3d803afb92a79469218";
const SAFE_TX_TYPEHASH =
  "0xbb8310d486368db6bd6f849402fdd73ad53d316b5a4b2644ad6efe0f941286d8";

const tx = buildSafeTxFields({
  to: CREATE_CALL,
  data: "0x4847be6f",
  operation: 0,
  nonce: 7n,
});

/** The Safe contract's digest, built by hand from the vendored typehashes. */
function vendoredSafeTxHash(): Hex {
  const domainSeparator = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }],
      [DOMAIN_SEPARATOR_TYPEHASH, BigInt(CHAIN_ID), SAFE],
    ),
  );
  const structHash = keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "address" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "uint8" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
      ],
      [
        SAFE_TX_TYPEHASH,
        tx.to,
        tx.value,
        keccak256(tx.data),
        tx.operation,
        tx.safeTxGas,
        tx.baseGas,
        tx.gasPrice,
        tx.gasToken,
        tx.refundReceiver,
        tx.nonce,
      ],
    ),
  );
  return keccak256(concat(["0x1901", domainSeparator, structHash]));
}

describe("computeSafeTxHash", () => {
  test("uses the exact type strings the vendored 1.4.1 typehashes commit to", () => {
    expect(
      keccak256(
        toHex("EIP712Domain(uint256 chainId,address verifyingContract)"),
      ),
    ).toBe(DOMAIN_SEPARATOR_TYPEHASH);
    expect(
      keccak256(
        toHex(
          "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)",
        ),
      ),
    ).toBe(SAFE_TX_TYPEHASH);
  });

  test("matches the digest built from the vendored typehashes", () => {
    expect(computeSafeTxHash(CHAIN_ID, SAFE, tx)).toBe(vendoredSafeTxHash());
  });
});

describe("buildSafeTxFields", () => {
  test("defaults gas params to zero and gas addresses to null", () => {
    expect(tx.value).toBe(0n);
    expect(tx.safeTxGas).toBe(0n);
    expect(tx.gasToken).toBe(NULL_ADDRESS);
    expect(tx.refundReceiver).toBe(NULL_ADDRESS);
  });
});

describe("packSafeSignatures", () => {
  test("sorts confirmations by owner address ascending", () => {
    const confirmations: SafeConfirmation[] = [
      { owner: SENDER, signature: `0x${"11".repeat(65)}` },
      {
        owner: "0x0000000000000000000000000000000000000001",
        signature: `0x${"22".repeat(65)}`,
      },
    ];
    expect(packSafeSignatures(confirmations)).toBe(
      `0x${"22".repeat(65)}${"11".repeat(65)}`,
    );
  });

  test("rejects an empty confirmation set", () => {
    expect(() => packSafeSignatures([])).toThrow("empty confirmation set");
  });
});

describe("Safe Transaction Service client", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const proposalInput = () => ({
    serviceUrl: DEFAULT_SAFE_TX_SERVICE_URL,
    chainId: CHAIN_ID,
    safe: SAFE,
    tx,
    safeTxHash: computeSafeTxHash(CHAIN_ID, SAFE, tx),
    sender: SENDER,
    signature: `0x${"11".repeat(65)}` as Hex,
  });

  test("POSTs the multisig-transactions endpoint on the gateway URL", async () => {
    let captured: { url: string; body: Record<string, unknown> } | undefined;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      captured = { url: String(url), body: JSON.parse(String(init?.body)) };
      return new Response("{}", { status: 201 });
    }) as unknown as typeof fetch;

    const input = proposalInput();
    await postSafeTransaction(input);

    expect(captured?.url).toBe(
      `https://api.safe.global/tx-service/basesep/api/v1/safes/${SAFE}/multisig-transactions/`,
    );
    expect(captured?.body.contractTransactionHash).toBe(input.safeTxHash);
    expect(captured?.body.nonce).toBe("7");
    expect(captured?.body.to).toBe(CREATE_CALL);
    expect(captured?.body.operation).toBe(0);
  });

  test("network failure surfaces as SafeServiceUnavailableError", async () => {
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    const error = await postSafeTransaction(proposalInput()).catch((e) => e);
    expect(error).toBeInstanceOf(SafeServiceUnavailableError);
    expect(error).toBeInstanceOf(SafeServiceError);
    expect(error.status).toBeUndefined();
    expect(error.message).toContain("unreachable");
  });

  test("5xx surfaces as SafeServiceUnavailableError with status", async () => {
    globalThis.fetch = (async () =>
      new Response("upstream down", {
        status: 503,
      })) as unknown as typeof fetch;

    const error = await postSafeTransaction(proposalInput()).catch((e) => e);
    expect(error).toBeInstanceOf(SafeServiceUnavailableError);
    expect(error.status).toBe(503);
    expect(error.detail).toBe("upstream down");
  });

  test("4xx surfaces as SafeProposalRejectedError with the body", async () => {
    globalThis.fetch = (async () =>
      new Response('{"nonFieldErrors":["duplicate nonce"]}', {
        status: 422,
      })) as unknown as typeof fetch;

    const error = await postSafeTransaction(proposalInput()).catch((e) => e);
    expect(error).toBeInstanceOf(SafeProposalRejectedError);
    expect(error).not.toBeInstanceOf(SafeServiceUnavailableError);
    expect(error.status).toBe(422);
    expect(error.detail).toContain("duplicate nonce");
    expect(error.message).toContain(
      "Safe Transaction Service rejected proposal (422)",
    );
  });

  test("GET failures use the same taxonomy", async () => {
    globalThis.fetch = (async () =>
      new Response("gateway timeout", {
        status: 504,
      })) as unknown as typeof fetch;

    const error = await fetchSafeTransaction(
      DEFAULT_SAFE_TX_SERVICE_URL,
      `0x${"ab".repeat(32)}`,
    ).catch((e) => e);
    expect(error).toBeInstanceOf(SafeServiceUnavailableError);
    expect(error.status).toBe(504);
  });
});

describe("waitForSafeConfirmations", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const safeTxHash: Hex = computeSafeTxHash(CHAIN_ID, SAFE, tx);

  const serviceBody = (confirmations: number) =>
    JSON.stringify({
      safe: SAFE,
      safeTxHash,
      to: tx.to,
      data: tx.data,
      operation: tx.operation,
      value: "0",
      nonce: 7,
      confirmations: Array.from({ length: confirmations }, () => ({
        owner: SENDER,
        signature: `0x${"11".repeat(65)}`,
      })),
      confirmationsRequired: 1,
      isExecuted: false,
    });

  test("polls via the injected delay until the threshold is met", async () => {
    let calls = 0;
    globalThis.fetch = (async () =>
      new Response(serviceBody(calls++ === 0 ? 0 : 1), {
        status: 200,
      })) as unknown as typeof fetch;

    const delays: number[] = [];
    const result = await waitForSafeConfirmations(
      DEFAULT_SAFE_TX_SERVICE_URL,
      safeTxHash,
      1,
      {
        delay: async (ms) => {
          delays.push(ms);
        },
        delayMs: 25,
      },
    );

    expect(result.confirmations.length).toBe(1);
    expect(delays).toEqual([25]);
    expect(calls).toBe(2);
  });

  test("an aborted signal stops polling before the next fetch", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(serviceBody(0), { status: 200 });
    }) as unknown as typeof fetch;

    const controller = new AbortController();
    controller.abort(new Error("user cancelled"));

    const error = await waitForSafeConfirmations(
      DEFAULT_SAFE_TX_SERVICE_URL,
      safeTxHash,
      1,
      { signal: controller.signal },
    ).catch((e) => e);

    expect(error.message).toBe("user cancelled");
    expect(calls).toBe(0);
  });

  test("the default delay rejects when aborted mid-wait", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(serviceBody(0), { status: 200 });
    }) as unknown as typeof fetch;

    const controller = new AbortController();
    setTimeout(() => controller.abort(new Error("closed wizard")), 10);

    const error = await waitForSafeConfirmations(
      DEFAULT_SAFE_TX_SERVICE_URL,
      safeTxHash,
      1,
      { delayMs: 10_000, signal: controller.signal },
    ).catch((e) => e);

    expect(error.message).toBe("closed wizard");
    expect(calls).toBe(1);
  });

  test("times out after the configured attempts", async () => {
    globalThis.fetch = (async () =>
      new Response(serviceBody(0), {
        status: 200,
      })) as unknown as typeof fetch;

    await expect(
      waitForSafeConfirmations(DEFAULT_SAFE_TX_SERVICE_URL, safeTxHash, 1, {
        attempts: 2,
        delay: async () => {},
      }),
    ).rejects.toThrow("timed out waiting for Safe confirmations");
  });
});
