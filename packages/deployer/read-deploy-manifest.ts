import { toBytes, type Hex } from "viem";
import {
  parseDeployManifest,
  type DeployManifest,
} from "./deploy-manifest.js";
import type { ImutableArtifact } from "./imutable-artifact.js";

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
): Promise<string> {
  if (/^https?:\/\//i.test(source)) {
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

/** Read and verify a deploy-manifest; returns the ImutableUnivocity artifact. */
export async function readImutableFromDeployManifest(
  source: string,
): Promise<{ manifest: DeployManifest; artifact: ImutableArtifact }> {
  const manifest = parseDeployManifest(await loadDeployManifestSource(source));
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
