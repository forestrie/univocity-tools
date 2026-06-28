import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  runArchiveExtract,
  runFetchRelease,
} from "@univocity-tools/contract-artefacts-common/main";
import fs from "node:fs/promises";
import path from "node:path";
import type { Hex } from "viem";
import type { AuthKind } from "@univocity-tools/git-options/options";
import type { BootstrapAlg } from "./bootstrap-key.js";
import type { DeployerCommonOptions } from "./options.js";
import {
  runProvisionImutableAlg,
  type ProvisionImutableAlgResult,
} from "./provision-imutable-alg.js";
import {
  verifyImutableBootstrap,
  verifyImutableBootstrapPair,
} from "./verify-imutable-bootstrap.js";

export type ProvisionImutableE2eOptions = DeployerCommonOptions & {
  rpcUrl: string;
  deployKey: Hex;
  proposalDir: string;
  releaseRoot?: string;
  runId?: string;
  es256PemOut: string;
  ks256KeyOut: string;
  skipFetch?: boolean;
  fetchOrg?: string;
  fetchRepo?: string;
  fetchArtefact?: string;
  fetchAuthKind?: AuthKind;
  algs?: BootstrapAlg[];
};

export type ProvisionImutableE2eResult = {
  runId: string;
  releaseRoot: string;
  es256?: ProvisionImutableAlgResult;
  ks256?: ProvisionImutableAlgResult;
};

async function findUnivocityArchive(workDir: string): Promise<string> {
  const base = path.join(workDir, "univocity");
  const entries = await fs.readdir(base, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.startsWith("univocity") && entry.name.endsWith(".tar.gz")) {
      return path.join(base, entry.name);
    }
  }
  throw new Error(`build archive not found under ${base} (run fetch-release)`);
}

async function ensureReleaseRoot(
  out: Out,
  options: ProvisionImutableE2eOptions,
): Promise<string> {
  if (options.releaseRoot !== undefined) {
    return path.resolve(options.releaseRoot);
  }
  if (options.skipFetch) {
    throw new Error(
      "releaseRoot is required when --skip-fetch is set (extract archive first)",
    );
  }
  const releaseRoot = path.resolve(options.workDir, "univocity-release");
  await runFetchRelease(out, {
    univocityRoot: options.univocityRoot,
    workDir: options.workDir,
    org: options.fetchOrg ?? "forestrie",
    repo: options.fetchRepo ?? "univocity",
    workflow: "release.yml",
    authKind: options.fetchAuthKind ?? "gh-cli",
    artefact: options.fetchArtefact ?? "univocity",
  });
  const archive = await findUnivocityArchive(options.workDir);
  await fs.mkdir(releaseRoot, { recursive: true });
  await runArchiveExtract(out, {
    univocityRoot: options.univocityRoot,
    workDir: options.workDir,
    forgeConfig: options.forgeConfig,
    buildRoot: options.buildRoot,
    outDir: options.outDir,
    srcDir: options.srcDir,
    cacheDir: options.cacheDir,
    libsDir: options.libsDir,
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    archive,
    releaseRoot,
  });
  return releaseRoot;
}

/** Fetch (optional), deploy es256/ks256 variants, and verify bootstrapConfig. */
export async function runProvisionImutableE2e(
  out: Out,
  options: ProvisionImutableE2eOptions,
): Promise<void> {
  await provisionImutableE2e(out, options);
}

/** Same as {@link runProvisionImutableE2e} but returns manifest paths for callers. */
export async function provisionImutableE2e(
  out: Out,
  options: ProvisionImutableE2eOptions,
): Promise<ProvisionImutableE2eResult> {
  const runId = options.runId ?? String(Math.floor(Date.now() / 1000));
  const algs = options.algs ?? (["es256", "ks256"] as BootstrapAlg[]);
  await fs.mkdir(options.proposalDir, { recursive: true });

  const releaseRoot = await ensureReleaseRoot(out, options);
  const algOptions = {
    ...options,
    releaseRoot,
    runId,
  };

  const result: ProvisionImutableE2eResult = {
    runId,
    releaseRoot,
  };

  for (const alg of algs) {
    const deployed = await runProvisionImutableAlg(out, {
      ...algOptions,
      bootstrapAlg: alg,
    });
    await verifyImutableBootstrap(out, options, deployed.manifest);
    if (alg === "es256") {
      result.es256 = deployed;
    } else {
      result.ks256 = deployed;
    }
  }

  if (result.es256 !== undefined && result.ks256 !== undefined) {
    verifyImutableBootstrapPair(result.es256.manifest, result.ks256.manifest);
    out.print(
      "distinct bootstrap addresses: es256=%s ks256=%s",
      result.es256.manifest.imutableUnivocity,
      result.ks256.manifest.imutableUnivocity,
    );
  }

  return result;
}
