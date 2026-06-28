import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDeployManifest } from "../deploy-manifest.js";
import {
  assertManifestReleaseId,
  bytecodeSha256,
  parseSha256Sidecar,
  verifyAndParseImutableManifest,
  verifyManifestBytesWithSidecar,
} from "../manifest-verify.js";

const FIXTURE = JSON.parse(
  readFileSync(
    path.join(import.meta.dir, "fixtures/deploy-manifest.fixture.json"),
    "utf8",
  ),
) as Record<string, unknown>;

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

describe("verifyAndParseImutableManifest", () => {
  test("accepts golden fixture", async () => {
    const { artifact } = await verifyAndParseImutableManifest(
      JSON.stringify(FIXTURE),
    );
    expect(artifact.bytecode).toBe(FIXTURE_BYTECODE);
  });

  test("rejects digest mismatch", async () => {
    const manifest = await manifestFixture();
    manifest.contracts.ImutableUnivocity.bytecodeSha256 = `${"a".repeat(64)}`;
    await expect(
      verifyAndParseImutableManifest(JSON.stringify(manifest)),
    ).rejects.toThrow("sha256 mismatch");
  });
});

describe("verifyManifestBytesWithSidecar", () => {
  test("accepts matching sidecar", async () => {
    const raw = JSON.stringify(FIXTURE);
    const bytes = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await verifyManifestBytesWithSidecar(
      bytes,
      `${hex}  deploy-manifest.fixture.json\n`,
    );
  });

  test("rejects mismatched sidecar", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(FIXTURE));
    await expect(
      verifyManifestBytesWithSidecar(
        bytes,
        `${"a".repeat(64)}  deploy-manifest.fixture.json\n`,
      ),
    ).rejects.toThrow("sidecar mismatch");
  });
});

describe("assertManifestReleaseId", () => {
  test("rejects mismatch", async () => {
    const manifest = await manifestFixture();
    expect(() =>
      assertManifestReleaseId(
        parseDeployManifest(JSON.stringify(manifest)),
        "v0.3.0",
      ),
    ).toThrow("releaseId mismatch");
  });
});

describe("parseSha256Sidecar", () => {
  test("parses shasum line", () => {
    expect(parseSha256Sidecar(`${"a".repeat(64)}  file.json\n`)).toBe(
      "a".repeat(64),
    );
  });
});
