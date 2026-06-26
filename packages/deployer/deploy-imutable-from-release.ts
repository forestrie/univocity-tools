import type { Out } from "@univocity-tools/cli-kit/reporting";
import { runArchiveExtract } from "@univocity-tools/contract-artefacts-common/main";
import {
  createGithubClient,
  getReleaseByTag,
  resolveGithubToken,
  type ReleaseAsset,
} from "@univocity-tools/github-api/main";
import {
  DEFAULT_GITHUB_ORG,
  DEFAULT_GITHUB_REPO,
} from "@univocity-tools/git-options/options";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { runExecuteProposal } from "./execute-proposal.js";
import type { DeployImutableFromReleaseOptions } from "./options.js";
import { runProposeImutable } from "./propose-imutable.js";
import { parseProposal } from "./proposal.js";

function findManifestAsset(
  assets: ReleaseAsset[],
  releaseTag: string,
): ReleaseAsset | undefined {
  const exact = `deploy-manifest-${releaseTag}.json`;
  const found = assets.find((asset) => asset.name === exact);
  if (found !== undefined) {
    return found;
  }
  return assets.find((asset) => asset.name.startsWith("deploy-manifest-"));
}

function findUnivocityArchive(
  assets: ReleaseAsset[],
  releaseTag: string,
): ReleaseAsset | undefined {
  const exact = `univocity-${releaseTag}.tar.gz`;
  const found = assets.find((asset) => asset.name === exact);
  if (found !== undefined) {
    return found;
  }
  return assets.find(
    (asset) =>
      asset.name.startsWith("univocity-") && asset.name.endsWith(".tar.gz"),
  );
}

async function downloadReleaseAsset(
  client: ReturnType<typeof createGithubClient>,
  asset: ReleaseAsset,
  destPath: string,
): Promise<void> {
  await client.downloadToFile(asset.url, destPath);
}

type ResolvedReleaseInputs = {
  fromManifest?: string;
  releaseRoot?: string;
};

async function resolveReleaseInputs(
  out: Out,
  releaseTag: string,
  options: DeployImutableFromReleaseOptions,
): Promise<ResolvedReleaseInputs> {
  const token = await resolveGithubToken(out, "auto");
  const client = createGithubClient({
    org: DEFAULT_GITHUB_ORG,
    repo: DEFAULT_GITHUB_REPO,
    token,
  });
  const release = await getReleaseByTag(client, releaseTag);
  out.print("Resolved release %s", release.tag_name);

  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "deployer-release-"),
  );
  const manifestAsset = findManifestAsset(release.assets, release.tag_name);
  if (manifestAsset !== undefined) {
    const manifestPath = path.join(tempDir, manifestAsset.name);
    await client.downloadToFile(manifestAsset.url, manifestPath);
    out.print("Using deploy-manifest asset %s", manifestAsset.name);
    return { fromManifest: manifestPath };
  }

  const archiveAsset = findUnivocityArchive(release.assets, release.tag_name);
  if (archiveAsset === undefined) {
    throw new Error(
      `release ${releaseTag} has no deploy-manifest or univocity archive asset`,
    );
  }

  const archivePath = path.join(options.workDir, archiveAsset.name);
  await downloadReleaseAsset(client, archiveAsset, archivePath);
  const releaseRoot = path.join(
    options.workDir,
    "release-root",
    release.tag_name,
  );
  await fs.mkdir(releaseRoot, { recursive: true });
  await runArchiveExtract(out, {
    univocityRoot: options.univocityRoot,
    workDir: options.workDir,
    forgeConfig: options.forgeConfig,
    outDir: options.outDir,
    buildRoot: options.buildRoot,
    foundryOut: options.foundryOut,
    foundrySrc: options.foundrySrc,
    foundryCache: options.foundryCache,
    foundryLibs: options.foundryLibs,
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    archive: archivePath,
    releaseRoot,
  });
  out.print("Extracted build archive to %s", releaseRoot);
  return { releaseRoot };
}

export type ImutableDeploymentManifest = {
  kind: "imutable-deployment";
  version: 1;
  bootstrapAlg: string;
  chainId: number;
  imutableUnivocity: string;
  publishMode: "eoa";
  from: string;
  releaseTag: string;
};

/** One-shot EOA deploy: fetch release assets, propose, execute, write manifest. */
export async function runDeployImutableFromRelease(
  out: Out,
  options: DeployImutableFromReleaseOptions,
): Promise<void> {
  if (options.safePublish) {
    throw new Error(
      "deploy imutable --from-release is EOA-only; use propose/approve for Safe",
    );
  }
  if (options.rpcUrl === undefined) {
    throw new Error("--from-release requires --rpc-url (or RPC_URL)");
  }
  if (options.deployKey === undefined) {
    throw new Error("--from-release requires --deploy-key (or DEPLOY_KEY)");
  }

  const resolved = await resolveReleaseInputs(
    out,
    options.fromRelease,
    options,
  );
  const proposalPath = path.join(
    options.workDir,
    `proposal-${options.fromRelease}.json`,
  );
  const proposeOptions = {
    ...options,
    fromManifest: resolved.fromManifest,
    releaseRoot: resolved.releaseRoot,
    outPath: proposalPath,
  };
  await runProposeImutable(out, proposeOptions);

  const executeOptions = {
    ...options,
    proposalFile: proposalPath,
    signer: {
      key: options.deployKey,
      address: privateKeyToAccount(options.deployKey).address,
    },
  };
  await runExecuteProposal(out, executeOptions);

  const proposal = parseProposal(await Bun.file(proposalPath).text());
  if (proposal.imutableUnivocity === null) {
    throw new Error(
      "deploy completed but proposal has no imutableUnivocity address",
    );
  }

  const manifest: ImutableDeploymentManifest = {
    kind: "imutable-deployment",
    version: 1,
    bootstrapAlg: proposal.bootstrapAlg,
    chainId: proposal.chainId,
    imutableUnivocity: proposal.imutableUnivocity,
    publishMode: "eoa",
    from: proposal.from,
    releaseTag: options.fromRelease,
  };
  const manifestPath =
    options.deploymentManifestOut ??
    path.join(options.workDir, `manifest-${options.fromRelease}.json`);
  await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  out.out("ImutableUnivocity deployed at: %s", proposal.imutableUnivocity);
  out.out("Deployment manifest: %s", manifestPath);
}
