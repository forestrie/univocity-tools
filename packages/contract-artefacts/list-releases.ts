import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseContractReleasesCatalog,
  parseReleasesFromDeploymentJson,
  type ContractRelease,
} from "@univocity-tools/deploy-core/list-releases";
import type { Out } from "@univocity-tools/cli-kit/reporting";
import type { ListReleasesOptions } from "./options.js";

export type ListContractReleasesOptions = {
  univocityRoot?: string | undefined;
  catalogPath?: string | undefined;
};

const DEFAULT_CATALOG = new URL(
  "../deploy-core/fixtures/contract-releases.json",
  import.meta.url,
).pathname;

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
    const deploymentPath = path.join(options.univocityRoot, "deployment.json");
    if (await fileExists(deploymentPath)) {
      return deploymentPath;
    }
  }
  return DEFAULT_CATALOG;
}

/** Load contract releases from fixture catalog or univocity deployment.json. */
export async function listContractReleases(
  options: ListContractReleasesOptions = {},
): Promise<ContractRelease[]> {
  const catalogPath = await resolveCatalogPath(options);
  const raw = await readFile(catalogPath, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (
    options.catalogPath === undefined &&
    options.univocityRoot !== undefined &&
    catalogPath.endsWith("deployment.json")
  ) {
    const fromDeployment = parseReleasesFromDeploymentJson(parsed);
    if (fromDeployment !== undefined) {
      return fromDeployment;
    }
  }

  return parseContractReleasesCatalog(raw);
}

/** Print contract releases as JSON on stdout. */
export async function runListReleases(
  out: Out,
  options: ListReleasesOptions,
): Promise<void> {
  const releases = await listContractReleases({
    univocityRoot: options.univocityRoot,
  });
  out.out("%s", JSON.stringify(releases));
}
