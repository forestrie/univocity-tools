import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import { ALG_KS256, DEFAULT_CHAIN_ID } from "../deploy-constants.js";
import { buildImutableDeploymentData } from "../imutable-deploy-data.js";
import {
  IMUTABLE_ARTIFACT_REL,
  imutableArtifactPath,
  readImutableBytecode,
} from "../imutable-artifact.js";
import { parseProposeImutableOptions } from "../options.js";
import { runProposeImutable } from "../propose-imutable.js";
import { parseProposal } from "../proposal.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const FIXTURE_BYTECODE = "0x6001";

function writeReleaseRootFixture(releaseRoot: string): void {
  const artifactDir = path.join(
    releaseRoot,
    "out",
    path.dirname(IMUTABLE_ARTIFACT_REL),
  );
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(
    path.join(releaseRoot, "out", IMUTABLE_ARTIFACT_REL),
    JSON.stringify({ bytecode: { object: FIXTURE_BYTECODE } }),
  );
}

describe("parseProposeImutableOptions release-root", () => {
  test("resolves --release-root to an absolute path", () => {
    const options = parseProposeImutableOptions({
      "source-root": ROOT,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "release-root": "/tmp/release",
    });
    expect(options.releaseRoot).toBe(path.resolve("/tmp/release"));
  });

  test("omits releaseRoot when flag is absent", () => {
    const prev = process.env.RELEASE_ROOT;
    delete process.env.RELEASE_ROOT;
    try {
      const options = parseProposeImutableOptions({
        "source-root": ROOT,
        "bootstrap-alg": "ks256",
        "bootstrap-ks256-signer": OWNER,
        "deploy-key": KEY_A,
      });
      expect(options.releaseRoot).toBeUndefined();
    } finally {
      if (prev === undefined) {
        delete process.env.RELEASE_ROOT;
      } else {
        process.env.RELEASE_ROOT = prev;
      }
    }
  });
});

describe("propose imutable from release root", () => {
  test("reads prebuilt bytecode and matches deployment data", async () => {
    const base = mkdtempSync(path.join(tmpdir(), "univocity-tools-release-"));
    const releaseRoot = path.join(base, "release");
    writeReleaseRootFixture(releaseRoot);
    try {
      const artifact = await readImutableBytecode(
        imutableArtifactPath(path.join(releaseRoot, "out")),
      );
      const deploymentData = buildImutableDeploymentData(
        artifact.bytecode,
        ALG_KS256,
        OWNER as `0x${string}`,
      );
      expect(deploymentData.startsWith(FIXTURE_BYTECODE)).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("release-root path proposes without rpc-url or forge/cast", async () => {
    const base = mkdtempSync(path.join(tmpdir(), "univocity-tools-propose-"));
    const releaseRoot = path.join(base, "release");
    writeReleaseRootFixture(releaseRoot);
    const out = createCaptureOut();
    try {
      const options = parseProposeImutableOptions({
        "source-root": ROOT,
        "bootstrap-alg": "ks256",
        "bootstrap-ks256-signer": OWNER,
        "deploy-key": KEY_A,
        "release-root": releaseRoot,
      });
      await runProposeImutable(out, options);
      const proposal = parseProposal(out.lines[0]!.text);
      expect(proposal.chainId).toBe(DEFAULT_CHAIN_ID);
      expect(proposal.imutableUnivocity).toBeNull();
      expect(proposal.publishMode).toBe("eoa");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
