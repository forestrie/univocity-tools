import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { ContractRelease } from "./contract-release.js";

export type { ContractRelease } from "./contract-release.js";

export type ListContractReleasesOptions = {
  /** Univocity contracts checkout; reads `deployment.json` when present. */
  univocityRoot?: string | undefined;
  /** Override catalog JSON path (tests and explicit callers). */
  catalogPath?: string | undefined;
};

const DEFAULT_CATALOG = path.join(
  import.meta.dirname,
  "fixtures/contract-releases.json",
);

type DeploymentJson = {
  releases?: ContractRelease[];
};

function parseCatalogJson(raw: string): ContractRelease[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("contract releases catalog must be a JSON array");
  }
  return parsed.map(normalizeReleaseEntry);
}

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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveCatalogPath(
  options: ListContractReleasesOptions,
): Promise<string> {
  if (options.catalogPath !== undefined) {
    return options.catalogPath;
  }
  if (options.univocityRoot !== undefined) {
    const deploymentPath = path.join(
      options.univocityRoot,
      "deployment.json",
    );
    if (await fileExists(deploymentPath)) {
      return deploymentPath;
    }
  }
  return DEFAULT_CATALOG;
}

/** List published contract releases and optional bootstrap addresses. */
export async function listContractReleases(
  options: ListContractReleasesOptions = {},
): Promise<ContractRelease[]> {
  const catalogPath = await resolveCatalogPath(options);
  const raw = await readFile(catalogPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (
    options.catalogPath === undefined &&
    options.univocityRoot !== undefined &&
    catalogPath.endsWith("deployment.json") &&
    parsed !== null &&
    typeof parsed === "object" &&
    !Array.isArray(parsed)
  ) {
    const deployment = parsed as DeploymentJson;
    if (Array.isArray(deployment.releases)) {
      return deployment.releases.map(normalizeReleaseEntry);
    }
  }

  return parseCatalogJson(raw);
}
