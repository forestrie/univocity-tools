import type { Out } from "@univocity-tools/cli-kit/reporting";
import { runArchiveExtract } from "@univocity-tools/contract-artefacts-common/main";
import {
  createGithubClient,
  DEFAULT_AUTH_KIND,
  getReleaseByTag,
  resolveGithubToken,
  type GithubClient,
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
import {
  runExecuteProposal,
  type ExecuteProposalRunDeps,
} from "./execute-proposal.js";
import { verifyDeployManifestSidecar } from "./read-deploy-manifest.js";
import type {
  DeployImutableFromReleaseOptions,
  ProposeImutableOptions,
} from "./options.js";
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

function findManifestSidecarAsset(
  assets: ReleaseAsset[],
  manifestName: string,
): ReleaseAsset | undefined {
  const exact = `${manifestName}.sha256`;
  const found = assets.find((asset) => asset.name === exact);
  if (found !== undefined) {
    return found;
  }
  return assets.find(
    (asset) =>
      asset.name.startsWith("deploy-manifest-") &&
      asset.name.endsWith(".sha256"),
  );
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

export type ResolvedReleaseInputs = {
  fromManifest?: string;
  releaseRoot?: string;
};

async function verifyManifestSidecarOrThrow(
  out: Out,
  options: DeployImutableFromReleaseOptions,
  client: GithubClient,
  manifestPath: string,
  manifestAsset: ReleaseAsset,
  assets: ReleaseAsset[],
): Promise<void> {
  if (options.insecure) {
    out.warn(
      "WARNING: --insecure skips deploy-manifest sha256 sidecar verification",
    );
    return;
  }

  const sidecarAsset = findManifestSidecarAsset(assets, manifestAsset.name);
  if (sidecarAsset === undefined) {
    throw new Error(
      `release is missing deploy-manifest sidecar ${manifestAsset.name}.sha256; ` +
        "refusing to proceed (pass --insecure to override)",
    );
  }

  const sidecarPath = `${manifestPath}.sha256`;
  await client.downloadToFile(sidecarAsset.url, sidecarPath);
  await verifyDeployManifestSidecar(manifestPath, sidecarPath);
  out.print("Verified deploy-manifest sidecar %s", sidecarAsset.name);
}

export async function resolveReleaseInputs(
  out: Out,
  releaseTag: string,
  options: DeployImutableFromReleaseOptions,
  client?: GithubClient,
): Promise<ResolvedReleaseInputs> {
  const githubClient =
    client ??
    createGithubClient({
      org: DEFAULT_GITHUB_ORG,
      repo: DEFAULT_GITHUB_REPO,
      token: await resolveGithubToken(out, DEFAULT_AUTH_KIND),
    });
  const release = await getReleaseByTag(githubClient, releaseTag);
  out.print("Resolved release %s", release.tag_name);

  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "deployer-release-"),
  );
  const manifestAsset = findManifestAsset(release.assets, release.tag_name);
  if (manifestAsset !== undefined) {
    const manifestPath = path.join(tempDir, manifestAsset.name);
    await githubClient.downloadToFile(manifestAsset.url, manifestPath);
    await verifyManifestSidecarOrThrow(
      out,
      options,
      githubClient,
      manifestPath,
      manifestAsset,
      release.assets,
    );
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
  await githubClient.downloadToFile(archiveAsset.url, archivePath);
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
    buildRoot: options.buildRoot,
    outDir: options.outDir,
    srcDir: options.srcDir,
    cacheDir: options.cacheDir,
    libsDir: options.libsDir,
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

export type DeployImutableFromReleaseDeps = {
  resolveRelease?: typeof resolveReleaseInputs;
  propose?: typeof runProposeImutable;
  execute?: typeof runExecuteProposal;
  executeDeps?: ExecuteProposalRunDeps;
};

/** One-shot EOA deploy: fetch release assets, propose, execute, write manifest. */
export async function runDeployImutableFromRelease(
  out: Out,
  options: DeployImutableFromReleaseOptions,
  deps?: DeployImutableFromReleaseDeps,
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

  const resolveRelease = deps?.resolveRelease ?? resolveReleaseInputs;
  const propose = deps?.propose ?? runProposeImutable;
  const execute = deps?.execute ?? runExecuteProposal;

  const resolved = await resolveRelease(out, options.fromRelease, options);
  const proposalPath = path.join(
    options.workDir,
    `proposal-${options.fromRelease}.json`,
  );
  const proposeOptions: ProposeImutableOptions = {
    ...options,
    outPath: proposalPath,
  };
  if (resolved.fromManifest !== undefined) {
    proposeOptions.fromManifest = resolved.fromManifest;
  } else if (resolved.releaseRoot !== undefined) {
    proposeOptions.releaseRoot = resolved.releaseRoot;
  }
  await propose(out, proposeOptions);

  const executeOptions = {
    ...options,
    proposalFile: proposalPath,
    signer: {
      key: options.deployKey,
      address: privateKeyToAccount(options.deployKey).address,
    },
  };
  await execute(out, executeOptions, deps?.executeDeps);

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
