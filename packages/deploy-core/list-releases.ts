import type { ContractRelease } from "./contract-release.js";

export type { ContractRelease } from "./contract-release.js";

type DeploymentJson = {
  releases?: ContractRelease[];
};

function normalizeReleaseEntry(entry: unknown): ContractRelease {
  if (entry === null || typeof entry !== "object") {
    throw new Error("contract release entry must be an object");
  }
  const record = entry as Record<string, unknown>;
  const version = record.version;
  if (typeof version !== "string" || version.trim().length === 0) {
    throw new Error("contract release entry requires version");
  }
  const release: ContractRelease = { version };
  if (record.es256Address !== undefined) {
    if (typeof record.es256Address !== "string") {
      throw new Error("es256Address must be a string when present");
    }
    release.es256Address = record.es256Address;
  }
  if (record.ks256Address !== undefined) {
    if (typeof record.ks256Address !== "string") {
      throw new Error("ks256Address must be a string when present");
    }
    release.ks256Address = record.ks256Address;
  }
  return release;
}

/** Parse a contract releases catalog JSON array. */
export function parseContractReleasesCatalog(raw: string): ContractRelease[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("contract releases catalog must be a JSON array");
  }
  return parsed.map(normalizeReleaseEntry);
}

/** Read `releases` from a parsed `deployment.json` object when present. */
export function parseReleasesFromDeploymentJson(
  parsed: unknown,
): ContractRelease[] | undefined {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  const deployment = parsed as DeploymentJson;
  if (!Array.isArray(deployment.releases)) {
    return undefined;
  }
  return deployment.releases.map(normalizeReleaseEntry);
}
