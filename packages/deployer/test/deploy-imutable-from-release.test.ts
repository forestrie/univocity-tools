import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import type {
  GithubClient,
  ReleaseAsset,
} from "@univocity-tools/github-api/main";
import {
  resolveReleaseInputs,
  runDeployImutableFromRelease,
} from "../deploy-imutable-from-release.js";
import { parseDeployImutableFromReleaseOptions } from "../options.js";
import { sha256FileHex } from "../file-sha256.js";
import { serializeProposal, type Proposal } from "../proposal.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const ADDR_A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const DEPLOYED = "0x1111111111111111111111111111111111111111" as const;

const FIXTURE_MANIFEST = {
  version: 1,
  releaseId: "v0.4.0",
  contracts: {
    ImutableUnivocity: {
      contractName: "ImutableUnivocity",
      creationBytecode: "0x6001",
      bytecodeSha256:
        "9e67b12fd8c58953460459cad7a6d4dd7d6d57594affce8206d1397c9c4db543",
      solcVersion: "0.8.26",
      constructorAbi: [],
    },
  },
};

function releaseAsset(name: string, url: string): ReleaseAsset {
  return {
    id: 1,
    name,
    url,
    browser_download_url: url,
  };
}

function stubGithubClient(config: {
  assets: ReleaseAsset[];
  tag?: string;
  downloads?: Record<string, string>;
}): GithubClient {
  const downloads = config.downloads ?? {};
  return {
    org: "forestrie",
    repo: "univocity",
    async getJson<T>(apiPath: string): Promise<T> {
      if (apiPath.includes("/releases/tags/")) {
        return {
          tag_name: config.tag ?? "v0.4.0",
          assets: config.assets,
        } as T;
      }
      throw new Error(`unexpected api path ${apiPath}`);
    },
    async downloadToFile(url: string, destPath: string): Promise<void> {
      const content = downloads[url];
      if (content === undefined) {
        throw new Error(`unexpected download url ${url}`);
      }
      writeFileSync(destPath, content);
    },
  };
}

describe("runDeployImutableFromRelease", () => {
  test("requires rpc-url", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
    });
    await expect(runDeployImutableFromRelease(out, options)).rejects.toThrow(
      "requires --rpc-url",
    );
  });

  test("rejects safe-publish", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "safe-publish": true,
    });
    await expect(runDeployImutableFromRelease(out, options)).rejects.toThrow(
      "EOA-only",
    );
  });

  test("orchestrates manifest path and writes deployment manifest", async () => {
    const out = createCaptureOut();
    const workDir = mkdtempSync(path.join(tmpdir(), "from-release-"));

    const proposal: Proposal = {
      kind: "deploy-imutable",
      version: 1,
      chainId: 84532,
      bootstrapAlg: "ks256",
      bootstrapKey: OWNER,
      imutableUnivocity: null,
      publishMode: "eoa",
      from: ADDR_A,
      signerRole: "deploy-key",
      transactions: [{ to: null, value: "0", data: "0x6001", operation: 0 }],
    };

    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "work-dir": workDir,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
    });

    try {
      await runDeployImutableFromRelease(out, options, {
        resolveRelease: async () => ({ fromManifest: "/tmp/manifest.json" }),
        propose: async (proposeOut, proposeOptions) => {
          const outPath = proposeOptions.outPath!;
          writeFileSync(outPath, `${serializeProposal(proposal)}\n`);
          proposeOut.out("%s", serializeProposal(proposal));
        },
        execute: async () => {
          const updated = { ...proposal, imutableUnivocity: DEPLOYED };
          writeFileSync(
            path.join(workDir, "proposal-v0.4.0.json"),
            `${serializeProposal(updated)}\n`,
          );
        },
      });

      const manifestPath = path.join(workDir, "manifest-v0.4.0.json");
      const written = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        imutableUnivocity: string;
        releaseTag: string;
      };
      expect(written.imutableUnivocity.toLowerCase()).toBe(
        DEPLOYED.toLowerCase(),
      );
      expect(written.releaseTag).toBe("v0.4.0");
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  test("resolveReleaseInputs rejects missing sidecar", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
    });
    const manifestAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json",
      "asset://manifest",
    );
    const client = stubGithubClient({
      assets: [manifestAsset],
      downloads: {
        "asset://manifest": JSON.stringify(FIXTURE_MANIFEST),
      },
    });
    await expect(
      resolveReleaseInputs(out, "v0.4.0", options, client),
    ).rejects.toThrow("missing asset deploy-manifest-v0.4.0.json.sha256");
  });

  test("resolveReleaseInputs happy path verifies sidecar and releaseId", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
    });
    const manifestJson = JSON.stringify(FIXTURE_MANIFEST);
    const manifestAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json",
      "asset://manifest",
    );
    const sidecarAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json.sha256",
      "asset://sidecar",
    );
    const scratch = mkdtempSync(path.join(tmpdir(), "manifest-digest-"));
    const scratchManifest = path.join(scratch, "deploy-manifest-v0.4.0.json");
    writeFileSync(scratchManifest, manifestJson);
    const digest = await sha256FileHex(scratchManifest);
    rmSync(scratch, { recursive: true, force: true });
    const client = stubGithubClient({
      assets: [manifestAsset, sidecarAsset],
      downloads: {
        "asset://manifest": manifestJson,
        "asset://sidecar": `${digest}  deploy-manifest-v0.4.0.json\n`,
      },
    });
    const resolved = await resolveReleaseInputs(
      out,
      "v0.4.0",
      options,
      client,
    );
    expect(resolved.fromManifest).toBeDefined();
  });

  test("resolveReleaseInputs rejects releaseId mismatch", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      insecure: true,
    });
    const badManifest = { ...FIXTURE_MANIFEST, releaseId: "v0.3.0" };
    const manifestAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json",
      "asset://manifest",
    );
    const client = stubGithubClient({
      assets: [manifestAsset],
      downloads: {
        "asset://manifest": JSON.stringify(badManifest),
      },
    });
    await expect(
      resolveReleaseInputs(out, "v0.4.0", options, client),
    ).rejects.toThrow("releaseId mismatch");
  });

  test("resolveReleaseInputs does not fall back to wrong-tag manifest", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      insecure: true,
    });
    const manifestAsset = releaseAsset(
      "deploy-manifest-v0.3.0.json",
      "asset://manifest",
    );
    const client = stubGithubClient({
      tag: "v0.4.0",
      assets: [manifestAsset],
      downloads: {
        "asset://manifest": JSON.stringify(FIXTURE_MANIFEST),
      },
    });
    await expect(
      resolveReleaseInputs(out, "v0.4.0", options, client),
    ).rejects.toThrow("deploy-manifest-v0.4.0.json");
  });

  test("resolveReleaseInputs rejects bad tag assets", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v9.9.9",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      insecure: true,
    });
    const client = stubGithubClient({ assets: [], tag: "v9.9.9" });
    await expect(
      resolveReleaseInputs(out, "v9.9.9", options, client),
    ).rejects.toThrow("deploy-manifest-v9.9.9.json");
  });

  test("resolveReleaseInputs allows missing sidecar with --insecure", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      insecure: true,
    });
    const manifestAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json",
      "asset://manifest",
    );
    const client = stubGithubClient({
      assets: [manifestAsset],
      downloads: {
        "asset://manifest": JSON.stringify(FIXTURE_MANIFEST),
      },
    });
    const resolved = await resolveReleaseInputs(
      out,
      "v0.4.0",
      options,
      client,
    );
    expect(resolved.fromManifest).toBeDefined();
  });
});

describe("parseDeployImutableFromReleaseOptions", () => {
  test("requires from-release", () => {
    expect(() =>
      parseDeployImutableFromReleaseOptions({
        "source-root": ROOT,
        "bootstrap-alg": "ks256",
        "bootstrap-ks256-signer": OWNER,
        "deploy-key": KEY_A,
      }),
    ).toThrow("--from-release");
  });
});
