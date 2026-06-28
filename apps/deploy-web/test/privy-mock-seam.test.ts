import { afterEach, describe, expect, test, vi } from "vitest";
import {
  MOCK_E2E_TX_HASH,
  MOCK_E2E_WALLET_ADDRESS,
  createMockEthereumProvider,
} from "../src/lib/privy/mock-ethereum-provider.js";

/**
 * Mock Privy seam tests — run with PUBLIC_E2E_PRIVY=mock so privy.ts uses mock path.
 * CI default (flag unset): only provider unit tests run; login tests skip.
 */
const mockPrivyEnabled = import.meta.env.PUBLIC_E2E_PRIVY === "mock";

describe("createMockEthereumProvider", () => {
  test("returns fixed account and chain id", async () => {
    const provider = createMockEthereumProvider();
    expect(await provider.request({ method: "eth_accounts" })).toEqual([
      MOCK_E2E_WALLET_ADDRESS,
    ]);
    expect(await provider.request({ method: "eth_chainId" })).toBe("0x14a34");
  });

  test("wallet_switchEthereumChain updates eth_chainId", async () => {
    const provider = createMockEthereumProvider({ chainIdHex: "0x1" });
    expect(await provider.request({ method: "eth_chainId" })).toBe("0x1");
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x14a34" }],
    });
    expect(await provider.request({ method: "eth_chainId" })).toBe("0x14a34");
  });

  test("eth_sendTransaction returns deterministic hash", async () => {
    const provider = createMockEthereumProvider();
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [{ from: MOCK_E2E_WALLET_ADDRESS, to: "0x0", value: "0x0" }],
    });
    expect(hash).toBe(MOCK_E2E_TX_HASH);
  });
});

describe.skipIf(!mockPrivyEnabled)("mock Privy login seam", () => {
  afterEach(async () => {
    const { logoutPrivy, resetPrivyClientForTests } =
      await import("../src/lib/privy.js");
    try {
      await logoutPrivy();
    } catch {
      // ignore
    }
    resetPrivyClientForTests();
  });

  test("login yields mock wallet address and provider", async () => {
    const {
      getPrivyEthereumProvider,
      getPrivyWalletAddress,
      loginWithPrivyEmail,
    } = await import("../src/lib/privy.js");

    await loginWithPrivyEmail("e2e@test.local");
    expect(await getPrivyWalletAddress()).toBe(MOCK_E2E_WALLET_ADDRESS);

    const provider = await getPrivyEthereumProvider();
    expect(provider).toBeTruthy();
    expect(await provider!.request({ method: "eth_accounts" })).toEqual([
      MOCK_E2E_WALLET_ADDRESS,
    ]);
  });

  test("mock provider deploys via deployImutableContract", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const { verifyAndParseImutableManifest } =
      await import("@univocity-tools/deploy-core");
    const { deployImutableContract } = await import("../src/lib/deploy.js");
    const {
      getPrivyEthereumProvider,
      loginWithPrivyEmail,
      resetPrivyClientForTests,
    } = await import("../src/lib/privy.js");

    resetPrivyClientForTests();
    await loginWithPrivyEmail("e2e@test.local");
    const provider = await getPrivyEthereumProvider();
    expect(provider).toBeTruthy();

    const fixture = readFileSync(
      path.join(
        import.meta.dirname,
        "../../../packages/deploy-core/test/fixtures/deploy-manifest.fixture.json",
      ),
      "utf8",
    );
    const { artifact } = await verifyAndParseImutableManifest(fixture);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { contractAddress: "0x" + "11".repeat(20) },
      }),
    }) as unknown as typeof fetch;

    try {
      const result = await deployImutableContract({
        provider: provider!,
        chainId: 84532,
        rpcUrl: "http://localhost:8545",
        artifact,
        bootstrap: {
          alg: "ks256",
          signer: MOCK_E2E_WALLET_ADDRESS,
        },
      });
      expect(result.genesis.bootstrapAlg).toBe("ks256");
      expect(result.contractAddress).toMatch(/^0x/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
