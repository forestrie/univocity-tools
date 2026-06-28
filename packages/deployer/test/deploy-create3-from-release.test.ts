import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import type { PublicClient } from "viem";
import { runDeployCreate3FromRelease } from "../deploy-create3-from-release.js";
import { resolveReleaseInputs } from "../deploy-imutable-from-release.js";
import { sha256FileHex } from "../file-sha256.js";
import {
  parseDeployCreate3FromReleaseOptions,
  parseDeployCreate3Options,
} from "../options.js";
import {
  FIXTURE_MANIFEST_WITH_FACTORY,
  releaseAsset,
  stubGithubClient,
} from "./helpers/from-release-fixtures.js";
import { createFakeRpcClients } from "./helpers/fake-rpc-clients.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("runDeployCreate3FromRelease", () => {
  test("orchestrates manifest path and deploys factory", async () => {
    const out = createCaptureOut();
    const workDir = mkdtempSync(path.join(tmpdir(), "create3-from-release-"));
    const options = parseDeployCreate3FromReleaseOptions({
      "source-root": ROOT,
      "work-dir": workDir,
      "from-release": "v0.4.0",
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "force-factory-deploy": true,
    });

    let deployCalled = false;
    try {
      await runDeployCreate3FromRelease(out, options, {
        resolveRelease: async () => ({ fromManifest: "/tmp/manifest.json" }),
        deployCreate3: async () => {
          deployCalled = true;
        },
      });
      expect(deployCalled).toBe(true);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  test("resolveReleaseInputs verifies sidecar for create3 from-release", async () => {
    const out = createCaptureOut();
    const options = parseDeployCreate3FromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
    });
    const manifestJson = JSON.stringify(FIXTURE_MANIFEST_WITH_FACTORY);
    const manifestAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json",
      "asset://manifest",
    );
    const sidecarAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json.sha256",
      "asset://sidecar",
    );
    const scratch = mkdtempSync(path.join(tmpdir(), "create3-digest-"));
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

  test("integration deploys CREATE3 factory from manifest without forge", async () => {
    const out = createCaptureOut();
    const workDir = mkdtempSync(path.join(tmpdir(), "create3-int-"));
    const manifestJson = JSON.stringify(FIXTURE_MANIFEST_WITH_FACTORY);
    const manifestAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json",
      "asset://manifest",
    );
    const sidecarAsset = releaseAsset(
      "deploy-manifest-v0.4.0.json.sha256",
      "asset://sidecar",
    );
    const scratch = mkdtempSync(path.join(tmpdir(), "create3-digest-"));
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
    const options = parseDeployCreate3FromReleaseOptions({
      "source-root": ROOT,
      "work-dir": workDir,
      "from-release": "v0.4.0",
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "force-factory-deploy": true,
    });
    const parsed = parseDeployCreate3Options({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "force-factory-deploy": true,
    });
    const proxy = parsed.create3.proxy.toLowerCase();
    const factory = parsed.create3.factory.toLowerCase();
    let sendCount = 0;
    const clients = createFakeRpcClients({
      bytecode: { [proxy]: "0x6001", [factory]: "0x" },
    });
    clients.walletClient.sendTransaction = async () => {
      sendCount += 1;
      return "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    };
    const publicClient = clients.publicClient as PublicClient & {
      getBytecode: (args: { address: string }) => Promise<"0x" | "0x6001">;
    };
    const originalGetBytecode = publicClient.getBytecode.bind(publicClient);
    publicClient.getBytecode = async ({ address }) => {
      const code = await originalGetBytecode({ address });
      if (address.toLowerCase() === factory && sendCount > 0) {
        return "0x6001";
      }
      return code;
    };
    const savedPath = process.env.PATH;
    Object.assign(process.env, {
      PATH: mkdtempSync(path.join(tmpdir(), "no-forge-")),
    });

    try {
      await runDeployCreate3FromRelease(out, options, {
        resolveRelease: (resolveOut, tag, resolveOptions) =>
          resolveReleaseInputs(resolveOut, tag, resolveOptions, client),
        deployCreate3: async (deployOut, deployOptions, deps) => {
          const { runDeployCreate3 } = await import("../deploy-create3.js");
          await runDeployCreate3(deployOut, deployOptions, {
            clients,
            publicClient,
            ...deps,
          });
        },
      });
      expect(sendCount).toBe(1);
    } finally {
      process.env.PATH = savedPath;
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});

describe("parseDeployCreate3FromReleaseOptions", () => {
  test("requires from-release", () => {
    expect(() =>
      parseDeployCreate3FromReleaseOptions({
        "source-root": ROOT,
        "deploy-key": KEY_A,
        "rpc-url": "http://127.0.0.1:8545",
      }),
    ).toThrow("--from-release");
  });
});
