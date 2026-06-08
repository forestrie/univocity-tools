import { afterEach, describe, expect, test } from "bun:test";
import {
  packSafeSignatures,
  postSafeConfirmation,
  type SafeConfirmation,
} from "../safe-client.js";

describe("packSafeSignatures", () => {
  test("sorts confirmations by owner address ascending", () => {
    const confirmations: SafeConfirmation[] = [
      {
        owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        signature: `0x${"11".repeat(65)}`,
      },
      {
        owner: "0x0000000000000000000000000000000000000001",
        signature: `0x${"22".repeat(65)}`,
      },
    ];
    expect(packSafeSignatures(confirmations)).toBe(
      `0x${"22".repeat(65)}${"11".repeat(65)}`,
    );
  });
});

describe("postSafeConfirmation", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("POSTs to the confirmations endpoint", async () => {
    let captured: { url: string; body: Record<string, unknown> } | undefined;
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      captured = {
        url: String(url),
        body: JSON.parse(String(init?.body)),
      };
      return new Response("{}", { status: 201 });
    }) as unknown as typeof fetch;

    const safeTxHash = `0x${"ab".repeat(32)}`;
    await postSafeConfirmation(
      "https://safe-transaction-base-sepolia.safe.global/",
      safeTxHash,
      `0x${"11".repeat(65)}`,
    );

    expect(captured?.url).toBe(
      `https://safe-transaction-base-sepolia.safe.global/api/v1/multisig-transactions/${safeTxHash}/confirmations/`,
    );
    expect(captured?.body.signature).toBe(`0x${"11".repeat(65)}`);
  });
});
