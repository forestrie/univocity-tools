import { describe, expect, test, vi } from "vitest";
import { ensureWalletChain } from "../src/lib/wallet-chain.js";

describe("ensureWalletChain", () => {
  test("no-ops when wallet is already on the target chain", async () => {
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === "eth_chainId") {
          return "0x14a34";
        }
        return null;
      }),
    };

    await ensureWalletChain(provider, 84532);
    expect(provider.request).toHaveBeenCalledTimes(1);
  });

  test("switches wallet when chain differs", async () => {
    let chainHex = "0x1";
    const provider = {
      request: vi.fn(
        async ({ method, params }: { method: string; params?: unknown[] }) => {
          if (method === "eth_chainId") {
            return chainHex;
          }
          if (method === "wallet_switchEthereumChain") {
            const target = (params?.[0] as { chainId: string }).chainId;
            chainHex = target;
            return null;
          }
          return null;
        },
      ),
    };

    await ensureWalletChain(provider, 84532);
    expect(chainHex).toBe("0x14a34");
  });

  test("adds chain then switches when wallet reports 4902", async () => {
    let chainHex = "0x1";
    let addCalled = false;
    const provider = {
      request: vi.fn(
        async ({ method, params }: { method: string; params?: unknown[] }) => {
          if (method === "eth_chainId") {
            return chainHex;
          }
          if (method === "wallet_switchEthereumChain") {
            if (!addCalled) {
              const error = new Error("Unrecognized chain") as Error & {
                code: number;
              };
              error.code = 4902;
              throw error;
            }
            const target = (params?.[0] as { chainId: string }).chainId;
            chainHex = target;
            return null;
          }
          if (method === "wallet_addEthereumChain") {
            addCalled = true;
            return null;
          }
          return null;
        },
      ),
    };

    await ensureWalletChain(provider, 84532);
    expect(addCalled).toBe(true);
    expect(chainHex).toBe("0x14a34");
  });

  test("rejects unsupported chain ids", async () => {
    const provider = {
      request: vi.fn(async () => "0x1"),
    };
    await expect(ensureWalletChain(provider, 1)).rejects.toThrow(
      "chain 1 is not supported for deploy",
    );
  });
});
