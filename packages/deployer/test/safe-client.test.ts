import { afterEach, describe, expect, test } from "bun:test";
import {
  concat,
  encodeAbiParameters,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import {
  buildSafeTxFields,
  computeSafeTxHash,
  NULL_ADDRESS,
  postSafeTransaction,
} from "../safe-client.js";

const CHAIN_ID = 84532;
const SAFE: Address = "0x1528b86ff561f617602356efdbD05908a07AA788";
const CREATE_CALL: Address = "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4";

const tx = buildSafeTxFields({
  to: CREATE_CALL,
  data: "0x4847be6f",
  operation: 0,
  nonce: 7n,
});

/** Independent EIP-712 SafeTx hash, per Safe >= 1.3.0 domain. */
function manualSafeTxHash(): Hex {
  const domainTypehash = keccak256(
    toBytes("EIP712Domain(uint256 chainId,address verifyingContract)"),
  );
  const domainSeparator = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }, { type: "address" }],
      [domainTypehash, BigInt(CHAIN_ID), SAFE],
    ),
  );
  const safeTxTypehash = keccak256(
    toBytes(
      "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)",
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
        safeTxTypehash,
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

describe("buildSafeTxFields", () => {
  test("defaults gas params to zero and gas addresses to null", () => {
    expect(tx.value).toBe(0n);
    expect(tx.safeTxGas).toBe(0n);
    expect(tx.gasToken).toBe(NULL_ADDRESS);
    expect(tx.refundReceiver).toBe(NULL_ADDRESS);
  });
});

describe("computeSafeTxHash", () => {
  test("matches an independent EIP-712 computation", () => {
    expect(computeSafeTxHash(CHAIN_ID, SAFE, tx)).toBe(manualSafeTxHash());
  });

  test("is deterministic", () => {
    expect(computeSafeTxHash(CHAIN_ID, SAFE, tx)).toBe(
      computeSafeTxHash(CHAIN_ID, SAFE, tx),
    );
  });
});

describe("postSafeTransaction", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("POSTs the multisig-transactions endpoint with the SafeTx payload", async () => {
    let captured: { url: string; body: Record<string, unknown> } | undefined;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      captured = {
        url: String(url),
        body: JSON.parse(String(init?.body)),
      };
      return new Response("{}", { status: 201 });
    }) as unknown as typeof fetch;

    const safeTxHash = computeSafeTxHash(CHAIN_ID, SAFE, tx);
    await postSafeTransaction({
      serviceUrl: "https://safe-transaction-base-sepolia.safe.global/",
      chainId: CHAIN_ID,
      safe: SAFE,
      tx,
      safeTxHash,
      sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      signature: `0x${"11".repeat(65)}`,
    });

    expect(captured?.url).toBe(
      `https://safe-transaction-base-sepolia.safe.global/api/v1/safes/${SAFE}/multisig-transactions/`,
    );
    expect(captured?.body.contractTransactionHash).toBe(safeTxHash);
    expect(captured?.body.nonce).toBe("7");
    expect(captured?.body.to).toBe(CREATE_CALL);
    expect(captured?.body.operation).toBe(0);
  });

  test("throws on a non-ok response", async () => {
    globalThis.fetch = (async () =>
      new Response("bad", { status: 422 })) as unknown as typeof fetch;
    await expect(
      postSafeTransaction({
        serviceUrl: "https://example.test",
        chainId: CHAIN_ID,
        safe: SAFE,
        tx,
        safeTxHash: `0x${"ab".repeat(32)}`,
        sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        signature: `0x${"11".repeat(65)}`,
      }),
    ).rejects.toThrow("Safe Transaction Service rejected proposal (422)");
  });
});
