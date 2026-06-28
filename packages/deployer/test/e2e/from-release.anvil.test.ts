import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import {
  resolveReleaseInputs,
  runDeployImutableFromRelease,
} from "../../deploy-imutable-from-release.js";
import { sha256FileHex } from "../../file-sha256.js";
import { parseDeployImutableFromReleaseOptions } from "../../options.js";
import {
  FIXTURE_MANIFEST,
  releaseAsset,
  stubGithubClient,
} from "../helpers/from-release-fixtures.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const RELEASE_TAG = "v0.4.0";
const ANVIL_PORT = 18_546;
const ANVIL_RPC = `http://127.0.0.1:${ANVIL_PORT}`;
const CREATION_BYTECODE = FIXTURE_MANIFEST.contracts.ImutableUnivocity
  .creationBytecode as string;

const haveAnvil = Bun.which("anvil") !== null;

function buildVerifiedReleaseClient() {
  const manifestJson = JSON.stringify(FIXTURE_MANIFEST);
  const manifestAsset = releaseAsset(
    `deploy-manifest-${RELEASE_TAG}.json`,
    "asset://manifest",
  );
  const sidecarAsset = releaseAsset(
    `deploy-manifest-${RELEASE_TAG}.json.sha256`,
    "asset://sidecar",
  );
  const scratch = mkdtempSync(path.join(tmpdir(), "from-release-digest-"));
  const scratchManifest = path.join(
    scratch,
    `deploy-manifest-${RELEASE_TAG}.json`,
  );
  writeFileSync(scratchManifest, manifestJson);
  const digestPromise = sha256FileHex(scratchManifest).then((digest) => {
    rmSync(scratch, { recursive: true, force: true });
    return digest;
  });
  return digestPromise.then((digest) =>
    stubGithubClient({
      tag: RELEASE_TAG,
      assets: [manifestAsset, sidecarAsset],
      downloads: {
        "asset://manifest": manifestJson,
        "asset://sidecar": `${digest}  deploy-manifest-${RELEASE_TAG}.json\n`,
      },
    }),
  );
}

describe.skipIf(!haveAnvil)("runDeployImutableFromRelease on anvil", () => {
  test("deploys from stub release manifest without forge or cast", async () => {
    const out = createNullOut();
    const workDir = mkdtempSync(path.join(tmpdir(), "from-release-anvil-"));
    const client = await buildVerifiedReleaseClient();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "work-dir": workDir,
      "from-release": RELEASE_TAG,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": ANVIL_RPC,
    });

    const proc = Bun.spawn(["anvil", "--port", String(ANVIL_PORT)], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await Bun.sleep(1500);

    const savedPath = process.env.PATH;
    Object.assign(process.env, {
      PATH: mkdtempSync(path.join(tmpdir(), "no-forge-")),
    });

    try {
      await runDeployImutableFromRelease(out, options, {
        resolveRelease: (resolveOut, tag, resolveOptions) =>
          resolveReleaseInputs(resolveOut, tag, resolveOptions, client),
      });

      const manifestPath = path.join(workDir, `manifest-${RELEASE_TAG}.json`);
      const written = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        publishMode: string;
        releaseTag: string;
        chainId: number;
        imutableUnivocity: string;
      };
      expect(written.publishMode).toBe("eoa");
      expect(written.releaseTag).toBe(RELEASE_TAG);
      expect(written.chainId).toBe(31_337);
      expect(written.imutableUnivocity).toMatch(/^0x[a-fA-F0-9]{40}$/);

      const proposalPath = path.join(workDir, `proposal-${RELEASE_TAG}.json`);
      const proposal = JSON.parse(readFileSync(proposalPath, "utf8")) as {
        imutableUnivocity: string;
        transactions: Array<{ data: string }>;
      };
      expect(proposal.imutableUnivocity.toLowerCase()).toBe(
        written.imutableUnivocity.toLowerCase(),
      );
      expect(
        proposal.transactions[0]?.data.startsWith(CREATION_BYTECODE),
      ).toBe(true);
    } finally {
      process.env.PATH = savedPath;
      proc.kill();
      rmSync(workDir, { recursive: true, force: true });
    }
  }, 30_000);
});
