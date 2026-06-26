import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import { parseDeployManifest } from "../deploy-manifest.js";
import {
  bytecodeSha256,
  readImutableFromDeployManifest,
} from "../read-deploy-manifest.js";
import { parseProposeImutableOptions } from "../options.js";
import { runProposeImutable } from "../propose-imutable.js";
import { parseProposal } from "../proposal.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const FIXTURE_BYTECODE = "0x6001" as const;

async function manifestFixture(bytecode: string = FIXTURE_BYTECODE) {
  const digest = await bytecodeSha256(bytecode as `0x${string}`);
  return {
    version: 1,
    releaseId: "v0.4.0",
    contracts: {
      ImutableUnivocity: {
        contractName: "ImutableUnivocity",
        creationBytecode: bytecode,
        bytecodeSha256: digest,
        solcVersion: "0.8.26",
        constructorAbi: [],
      },
    },
  };
}

describe("parseDeployManifest", () => {
  test("accepts a valid manifest", async () => {
    const manifest = await manifestFixture();
    expect(parseDeployManifest(JSON.stringify(manifest)).releaseId).toBe(
      "v0.4.0",
    );
  });

  test("rejects sha256 digest with wrong length", async () => {
    const manifest = await manifestFixture();
    manifest.contracts.ImutableUnivocity.bytecodeSha256 = "abc";
    expect(() => parseDeployManifest(JSON.stringify(manifest))).toThrow(
      "bytecodeSha256",
    );
  });
});

describe("readImutableFromDeployManifest", () => {
  test("reads bytecode when digest matches", async () => {
    const base = mkdtempSync(path.join(tmpdir(), "deploy-manifest-"));
    const file = path.join(base, "deploy-manifest-v0.4.0.json");
    writeFileSync(file, JSON.stringify(await manifestFixture()));
    try {
      const { artifact } = await readImutableFromDeployManifest(file);
      expect(artifact.bytecode).toBe(FIXTURE_BYTECODE);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("rejects digest mismatch", async () => {
    const base = mkdtempSync(path.join(tmpdir(), "deploy-manifest-"));
    const file = path.join(base, "deploy-manifest-v0.4.0.json");
    const manifest = await manifestFixture();
    manifest.contracts.ImutableUnivocity.bytecodeSha256 = `${"a".repeat(64)}`;
    writeFileSync(file, JSON.stringify(manifest));
    try {
      await expect(readImutableFromDeployManifest(file)).rejects.toThrow(
        "sha256 mismatch",
      );
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe("propose imutable from manifest", () => {
  test("--from-manifest proposes without forge/cast", async () => {
    const base = mkdtempSync(path.join(tmpdir(), "deploy-manifest-propose-"));
    const file = path.join(base, "deploy-manifest-v0.4.0.json");
    writeFileSync(file, JSON.stringify(await manifestFixture()));
    const out = createCaptureOut();
    try {
      const options = parseProposeImutableOptions({
        "source-root": ROOT,
        "bootstrap-alg": "ks256",
        "bootstrap-ks256-signer": OWNER,
        "deploy-key": KEY_A,
        "from-manifest": file,
      });
      await runProposeImutable(out, options);
      const proposal = parseProposal(out.lines[0]!.text);
      expect(proposal.transactions[0]?.data.startsWith(FIXTURE_BYTECODE)).toBe(
        true,
      );
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  test("rejects --release-root and --from-manifest together", () => {
    expect(() =>
      parseProposeImutableOptions({
        "source-root": ROOT,
        "bootstrap-alg": "ks256",
        "bootstrap-ks256-signer": OWNER,
        "deploy-key": KEY_A,
        "release-root": "/tmp/release",
        "from-manifest": "/tmp/manifest.json",
      }),
    ).toThrow("mutually exclusive");
  });
});
