import { toBytes, type Hex } from "viem";
import { verifyFileSha256Sidecar } from "./file-sha256.js";
import {
  parseDeployManifest,
  type DeployManifest,
} from "./deploy-manifest.js";
import type { ImutableArtifact } from "./imutable-artifact.js";

export type LoadDeployManifestOptions = {
  /** Allow http:// URLs and skip TLS concerns (local dev only). */
  insecure?: boolean;
  /** When set, manifest.releaseId must match this tag (fail-closed). */
  expectedReleaseId?: string;
  /** Local sidecar path; verified before parse when source is a local file. */
  manifestSidecar?: string;
};

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

/** Load manifest JSON from a local path or http(s) URL. */
export async function loadDeployManifestSource(
  source: string,
  options?: LoadDeployManifestOptions,
): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
    if (source.startsWith("http://") && !options?.insecure) {
      throw new Error(
        "deploy-manifest http:// URLs require --insecure (use https or a local file)",
      );
    }
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(
        `failed to fetch deploy-manifest from ${source}: HTTP ${response.status}`,
      );
    }
    return response.text();
  }
  return Bun.file(source).text();
}

async function verifyLocalManifestSidecarIfPresent(
  source: string,
  options?: LoadDeployManifestOptions,
): Promise<void> {
  if (options?.manifestSidecar === undefined || /^https?:\/\//i.test(source)) {
    return;
  }
  await verifyDeployManifestSidecar(source, options.manifestSidecar);
}

/** Read and verify a deploy-manifest; returns the ImutableUnivocity artifact. */
export async function readImutableFromDeployManifest(
  source: string,
  options?: LoadDeployManifestOptions,
): Promise<{ manifest: DeployManifest; artifact: ImutableArtifact }> {
  await verifyLocalManifestSidecarIfPresent(source, options);
  const manifest = parseDeployManifest(
    await loadDeployManifestSource(source, options),
  );
  if (options?.expectedReleaseId !== undefined) {
    assertManifestReleaseId(manifest, options.expectedReleaseId);
  }
  const entry = manifest.contracts.ImutableUnivocity;
  await assertBytecodeSha256(
    entry.contractName,
    entry.creationBytecode,
    entry.bytecodeSha256,
  );
  return {
    manifest,
    artifact: { bytecode: entry.creationBytecode },
  };
}

/** Verify all contract bytecode digests in a manifest (throws on mismatch). */
export async function verifyDeployManifestDigests(
  manifest: DeployManifest,
): Promise<void> {
  await assertBytecodeSha256(
    manifest.contracts.ImutableUnivocity.contractName,
    manifest.contracts.ImutableUnivocity.creationBytecode,
    manifest.contracts.ImutableUnivocity.bytecodeSha256,
  );
  const factory = manifest.contracts.CREATE3Factory;
  if (factory !== undefined) {
    await assertBytecodeSha256(
      factory.contractName,
      factory.creationBytecode,
      factory.bytecodeSha256,
    );
  }
}

/** Verify a local manifest file against its shasum sidecar. */
export async function verifyDeployManifestSidecar(
  manifestPath: string,
  sidecarPath: string,
): Promise<void> {
  await verifyFileSha256Sidecar(manifestPath, sidecarPath);
}
