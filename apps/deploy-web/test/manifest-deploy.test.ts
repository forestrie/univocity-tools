import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  parseSha256Sidecar,
  verifyAndParseImutableManifest,
  verifyManifestBytesWithSidecar,
} from "@univocity-tools/deploy-core";
import {
  fetchVerifiedManifest,
  verifyManifestFiles,
} from "../src/lib/manifest.js";

const FIXTURE = readFileSync(
  path.join(
    import.meta.dirname,
    "../../../packages/deploy-core/test/fixtures/deploy-manifest.fixture.json",
  ),
  "utf8",
);

describe("fetchVerifiedManifest", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("fetches and verifies manifest via same-origin API for v0.1.4", async () => {
    const manifest = FIXTURE.replace(
      '"releaseId": "v0.4.0-fixture"',
      '"releaseId": "v0.1.4"',
    );
    const bytes = new TextEncoder().encode(manifest);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const sidecar = `${hex}  deploy-manifest-v0.1.4.json\n`;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/manifest/v0.1.4");
      return new Response(
        JSON.stringify({
          releaseTag: "v0.1.4",
          raw: manifest,
          sidecar,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await fetchVerifiedManifest("0.1.4");
    expect(result.releaseTag).toBe("v0.1.4");
    expect(result.artifact.bytecode).toBe("0x6001");
  });

  test("surfaces API proxy errors for missing releases", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: "GitHub release v0.1.5 not found (404)" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    await expect(fetchVerifiedManifest("v0.1.5")).rejects.toThrow(
      "GitHub release v0.1.5 not found (404)",
    );
  });
});

describe("verifyManifestFiles", () => {
  test("accepts matching manifest and sidecar files", async () => {
    const bytes = new TextEncoder().encode(FIXTURE);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const sidecar = `${hex}  deploy-manifest.fixture.json\n`;
    const manifestFile = new File([FIXTURE], "deploy-manifest.fixture.json", {
      type: "application/json",
    });
    const sidecarFile = new File(
      [sidecar],
      "deploy-manifest.fixture.json.sha256",
      {
        type: "text/plain",
      },
    );
    const result = await verifyManifestFiles(manifestFile, sidecarFile);
    expect(result.artifact.bytecode).toBe("0x6001");
  });

  test("rejects tampered manifest", async () => {
    const tampered = FIXTURE.replace("0x6001", "0x6002");
    const bytes = new TextEncoder().encode(FIXTURE);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const manifestFile = new File([tampered], "manifest.json", {
      type: "application/json",
    });
    const sidecarFile = new File(
      [`${hex}  manifest.json\n`],
      "manifest.json.sha256",
      { type: "text/plain" },
    );
    await expect(
      verifyManifestFiles(manifestFile, sidecarFile),
    ).rejects.toThrow("sidecar mismatch");
  });
});

describe("parseSha256Sidecar", () => {
  test("parses digest from shasum line", () => {
    expect(
      parseSha256Sidecar("abc" + "d".repeat(61) + "  file\n"),
    ).toHaveLength(64);
  });
});

describe("buildDeploymentTxData", () => {
  test("builds deployment data for KS256 bootstrap", async () => {
    const { buildDeploymentTxData } = await import("../src/lib/deploy.js");
    const { artifact } = await verifyAndParseImutableManifest(FIXTURE);
    const { deploymentData, bootstrapAlg } = await buildDeploymentTxData(
      artifact,
      {
        alg: "ks256",
        signer: "0x1528b86ff561f617602356efdbD05908a07AA788",
      },
    );
    expect(bootstrapAlg).toBe("ks256");
    expect(deploymentData.startsWith("0x6001")).toBe(true);
  });
});

describe("assertWalletChainMatches", () => {
  test("rejects when wallet chainId differs from configured chain", async () => {
    const { assertWalletChainMatches } = await import("../src/lib/deploy.js");
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === "eth_chainId") {
          return "0x1";
        }
        return null;
      }),
    };
    await expect(assertWalletChainMatches(provider, 84532)).rejects.toThrow(
      "wallet chainId 1 does not match configured 84532",
    );
  });
});

describe("deployImutableContract", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("sends contract creation tx via mock provider", async () => {
    const { deployImutableContract } = await import("../src/lib/deploy.js");
    const { artifact } = await verifyAndParseImutableManifest(FIXTURE);
    const sendTransaction = vi.fn().mockResolvedValue("0x" + "ab".repeat(32));
    const provider = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === "eth_accounts") {
          return ["0x1528b86ff561f617602356efdbD05908a07AA788"];
        }
        if (method === "eth_sendTransaction") {
          return sendTransaction();
        }
        if (method === "eth_chainId") {
          return "0x14a34"; // 84532
        }
        return null;
      }),
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          contractAddress: "0x" + "11".repeat(20),
        },
      }),
    }) as unknown as typeof fetch;

    const result = await deployImutableContract({
      provider,
      chainId: 84532,
      rpcUrl: "http://localhost:8545",
      artifact,
      bootstrap: {
        alg: "ks256",
        signer: "0x1528b86ff561f617602356efdbD05908a07AA788",
      },
    });
    expect(result.genesis.bootstrapAlg).toBe("ks256");
    expect(result.genesis.chainId).toBe(84532);
    expect(result.contractAddress).toMatch(/^0x/);
  });
});
