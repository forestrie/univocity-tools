import { describe, expect, test, vi } from "vitest";
import {
  normalizeEthereumAccounts,
  resolveDeployAccount,
} from "../src/lib/wallet-accounts.js";

describe("normalizeEthereumAccounts", () => {
  test("accepts a single checksummed address string", () => {
    expect(
      normalizeEthereumAccounts("0x1528b86ff561f617602356efdbD05908a07AA788"),
    ).toEqual(["0x1528b86ff561f617602356efdbD05908a07AA788"]);
  });

  test("filters invalid entries from provider arrays", () => {
    expect(
      normalizeEthereumAccounts([
        "0x1528b86ff561f617602356efdbD05908a07AA788",
        "0x",
        null,
      ]),
    ).toEqual(["0x1528b86ff561f617602356efdbD05908a07AA788"]);
  });

  test("returns empty for missing or malformed responses", () => {
    expect(normalizeEthereumAccounts(undefined)).toEqual([]);
    expect(normalizeEthereumAccounts({})).toEqual([]);
  });
});

describe("resolveDeployAccount", () => {
  test("uses preferred address without calling the provider", async () => {
    const provider = {
      request: vi.fn(),
    };
    const account = await resolveDeployAccount(
      provider,
      "0x1528b86ff561f617602356efdbD05908a07AA788",
    );
    expect(account).toBe("0x1528b86ff561f617602356efdbD05908a07AA788");
    expect(provider.request).not.toHaveBeenCalled();
  });

  test("falls back to eth_requestAccounts when eth_accounts is empty", async () => {
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === "eth_accounts") {
          return [];
        }
        if (method === "eth_requestAccounts") {
          return ["0x1528b86ff561f617602356efdbD05908a07AA788"];
        }
        return null;
      }),
    };
    const account = await resolveDeployAccount(provider);
    expect(account).toBe("0x1528b86ff561f617602356efdbD05908a07AA788");
  });
});
