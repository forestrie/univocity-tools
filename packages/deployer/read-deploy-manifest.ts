import {
  assertManifestReleaseId,
  bytecodeSha256,
  parseDeployManifest,
  verifyDeployManifestDigests,
  type DeployManifest,
} from "@univocity-tools/deploy-core";
import type { ImutableArtifact } from "./imutable-artifact.js";
import { verifyFileSha256Sidecar } from "./file-sha256.js";

export type LoadDeployManifestOptions = {
  /** Allow http:// URLs and skip TLS concerns (local dev only). */
  insecure?: boolean;
  /** When set, manifest.releaseId must match this tag (fail-closed). */
  expectedReleaseId?: string;
  /** Local sidecar path; verified before parse when source is a local file. */
  manifestSidecar?: string;
};

export function pickManifestLoadOptions(input: {
  insecure?: boolean | undefined;
  expectedReleaseId?: string | undefined;
  manifestSidecar?: string | undefined;
}): LoadDeployManifestOptions | undefined {
  const options: LoadDeployManifestOptions = {};
  if (input.manifestSidecar !== undefined) {
    options.manifestSidecar = input.manifestSidecar;
  }
  if (input.expectedReleaseId !== undefined) {
    options.expectedReleaseId = input.expectedReleaseId;
  }
  if (input.insecure) {
    options.insecure = true;
  }
  return Object.keys(options).length > 0 ? options : undefined;
}

export {
  assertManifestReleaseId,
  bytecodeSha256,
  verifyDeployManifestDigests,
} from "@univocity-tools/deploy-core";

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

async function loadVerifiedManifest(
  source: string,
  options?: LoadDeployManifestOptions,
): Promise<DeployManifest> {
  await verifyLocalManifestSidecarIfPresent(source, options);
  const manifest = parseDeployManifest(
    await loadDeployManifestSource(source, options),
  );
  if (options?.expectedReleaseId !== undefined) {
    assertManifestReleaseId(manifest, options.expectedReleaseId);
  }
  await verifyDeployManifestDigests(manifest);
  return manifest;
}

/** Read and verify a deploy-manifest; returns the ImutableUnivocity artifact. */
export async function readImutableFromDeployManifest(
  source: string,
  options?: LoadDeployManifestOptions,
): Promise<{ manifest: DeployManifest; artifact: ImutableArtifact }> {
  const manifest = await loadVerifiedManifest(source, options);
  const entry = manifest.contracts.ImutableUnivocity;
  return {
    manifest,
    artifact: { bytecode: entry.creationBytecode },
  };
}

/** Read CREATE3Factory bytecode from a deploy manifest. */
export async function readCreate3FromDeployManifest(
  source: string,
  options?: LoadDeployManifestOptions,
): Promise<{ manifest: DeployManifest; artifact: ImutableArtifact }> {
  const manifest = await loadVerifiedManifest(source, options);
  const entry = manifest.contracts.CREATE3Factory;
  if (entry === undefined) {
    throw new Error("deploy-manifest has no CREATE3Factory contract entry");
  }
  return {
    manifest,
    artifact: { bytecode: entry.creationBytecode },
  };
}

export type UupsManifestArtifacts = {
  manifest: DeployManifest;
  uupsImplBytecode: `0x${string}`;
  erc1967ProxyBytecode: `0x${string}`;
  initializeAbi: readonly unknown[];
};

/** Read UUPSUnivocity + ERC1967Proxy bytecode from a deploy manifest. */
export async function readUupsFromDeployManifest(
  source: string,
  options?: LoadDeployManifestOptions,
): Promise<UupsManifestArtifacts> {
  const manifest = await loadVerifiedManifest(source, options);
  const uups = manifest.contracts.UUPSUnivocity;
  const proxy = manifest.contracts.ERC1967Proxy;
  if (uups === undefined) {
    throw new Error("deploy-manifest has no UUPSUnivocity contract entry");
  }
  if (proxy === undefined) {
    throw new Error("deploy-manifest has no ERC1967Proxy contract entry");
  }
  const initializeAbi =
    uups.abi?.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        (item as { type?: string }).type === "function" &&
        (item as { name?: string }).name === "initialize",
    ) ?? [];
  if (initializeAbi.length === 0) {
    throw new Error(
      "deploy-manifest UUPSUnivocity entry missing initialize ABI",
    );
  }
  return {
    manifest,
    uupsImplBytecode: uups.creationBytecode,
    erc1967ProxyBytecode: proxy.creationBytecode,
    initializeAbi,
  };
}

/** Verify a local manifest file against its shasum sidecar. */
export async function verifyDeployManifestSidecar(
  manifestPath: string,
  sidecarPath: string,
): Promise<void> {
  await verifyFileSha256Sidecar(manifestPath, sidecarPath);
}
