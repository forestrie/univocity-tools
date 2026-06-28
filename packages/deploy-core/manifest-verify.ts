import { toBytes, type Hex } from "viem";
import type { DeployManifest } from "./deploy-manifest.js";
import { parseDeployManifest } from "./deploy-manifest.js";

/** Genesis handoff JSON for FORKING Step 2 (onboard request). */
export type GenesisBinding = {
  chainId: number;
  univocityAddr: string;
  bootstrapAlg: "es256" | "ks256";
};

/** ImutableUnivocity creation bytecode from a verified manifest. */
export type ImutableBytecode = {
  bytecode: Hex;
};

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** SHA-256 digest of creation bytecode bytes (lowercase hex, no 0x prefix). */
export async function bytecodeSha256(bytecode: Hex): Promise<string> {
  return sha256Hex(toBytes(bytecode));
}

/** Parse a shasum sidecar (first field is the digest). */
export function parseSha256Sidecar(contents: string): string {
  const line = contents.trim().split("\n")[0]?.trim() ?? "";
  const digest = line.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error("invalid sha256 sidecar: expected 64-char hex digest");
  }
  return digest;
}

/** Verify manifest JSON bytes against a shasum sidecar string. */
export async function verifyManifestBytesWithSidecar(
  manifestBytes: Uint8Array,
  sidecarContents: string,
): Promise<void> {
  const expected = parseSha256Sidecar(sidecarContents);
  const actual = await sha256Hex(manifestBytes);
  if (actual !== expected) {
    throw new Error(
      `deploy-manifest sha256 sidecar mismatch: expected ${expected}, got ${actual}`,
    );
  }
}

/** Fail when manifest releaseId does not match the requested release tag. */
export function assertManifestReleaseId(
  manifest: DeployManifest,
  expectedTag: string,
): void {
  if (manifest.releaseId !== expectedTag) {
    throw new Error(
      `deploy-manifest releaseId mismatch: expected ${expectedTag}, ` +
        `got ${manifest.releaseId}`,
    );
  }
}

async function assertBytecodeSha256(
  contractName: string,
  bytecode: Hex,
  expected: string,
): Promise<void> {
  const actual = await bytecodeSha256(bytecode);
  if (actual !== expected.toLowerCase()) {
    throw new Error(
      `${contractName} bytecode sha256 mismatch: expected ${expected}, got ${actual}`,
    );
  }
}

/** Verify all contract bytecode digests in a manifest (throws on mismatch). */
export async function verifyDeployManifestDigests(
  manifest: DeployManifest,
): Promise<void> {
  for (const entry of Object.values(manifest.contracts)) {
    await assertBytecodeSha256(
      entry.contractName,
      entry.creationBytecode,
      entry.bytecodeSha256,
    );
  }
}

/**
 * Parse manifest JSON, optionally check releaseId, verify embedded bytecode
 * digests. Returns manifest + Imutable bytecode.
 */
export async function verifyAndParseImutableManifest(
  rawJson: string,
  options?: { expectedReleaseId?: string },
): Promise<{ manifest: DeployManifest; artifact: ImutableBytecode }> {
  const manifest = parseDeployManifest(rawJson);
  if (options?.expectedReleaseId !== undefined) {
    assertManifestReleaseId(manifest, options.expectedReleaseId);
  }
  await verifyDeployManifestDigests(manifest);
  return {
    manifest,
    artifact: {
      bytecode: manifest.contracts.ImutableUnivocity.creationBytecode,
    },
  };
}

/** Build release asset URLs for a Univocity tag. */
export function univocityManifestUrls(
  releaseTag: string,
  releasesBase = "https://github.com/forestrie/univocity/releases/download",
): { manifestUrl: string; sidecarUrl: string; manifestFileName: string } {
  const manifestFileName = `deploy-manifest-${releaseTag}.json`;
  const base = `${releasesBase}/${releaseTag}`;
  return {
    manifestFileName,
    manifestUrl: `${base}/${manifestFileName}`,
    sidecarUrl: `${base}/${manifestFileName}.sha256`,
  };
}
