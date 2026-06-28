import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  requireCastBin,
  toFoundryExecContext,
} from "@univocity-tools/foundry-exec/require-bins";
import { runCast } from "@univocity-tools/foundry-exec/spawn";
import { getAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import path from "node:path";
import type { BootstrapAlg } from "./bootstrap-key.js";
import {
  DEFAULT_CREATE_CALL,
  DEFAULT_SAFE_TX_SERVICE_URL,
} from "./deploy-constants.js";
import {
  writeImutableDeploymentManifest,
  type ImutableDeploymentManifest,
} from "./imutable-deployment-manifest.js";
import { runExecuteProposal } from "./execute-proposal.js";
import type { DeployerCommonOptions } from "./options.js";
import { runProposeImutable } from "./propose-imutable.js";
import { parseProposal } from "./proposal.js";

export type ProvisionImutableAlgOptions = DeployerCommonOptions & {
  releaseRoot: string;
  proposalDir: string;
  runId: string;
  bootstrapAlg: BootstrapAlg;
  rpcUrl: string;
  deployKey: Hex;
  es256PemOut: string;
  ks256KeyOut: string;
  codePollAttempts?: number;
  codePollIntervalMs?: number;
  /** Test hook: skip post-deploy code polling (Anvil is immediate). */
  skipCodeWait?: boolean;
};

export type ProvisionImutableAlgResult = {
  manifestPath: string;
  pointerPath: string;
  manifest: ImutableDeploymentManifest;
  proposalPath: string;
};

function manifestPathFor(
  proposalDir: string,
  alg: BootstrapAlg,
  chainId: number,
  address: Address,
): string {
  const short = address.slice(2, 10).toLowerCase();
  return path.join(
    proposalDir,
    `manifest-${alg}-${chainId}-${short}.json`,
  );
}

function pointerPathFor(
  proposalDir: string,
  runId: string,
  alg: BootstrapAlg,
): string {
  return path.join(proposalDir, `provision-${runId}-${alg}.manifest`);
}

async function waitForContractCode(
  out: Out,
  options: ProvisionImutableAlgOptions,
  address: Address,
): Promise<void> {
  requireCastBin(options);
  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    out,
    cwd: options.univocityRoot,
  });
  const attempts = options.codePollAttempts ?? 30;
  const intervalMs = options.codePollIntervalMs ?? 2000;
  out.print("waiting for contract code at %s...", address);
  for (let i = 1; i <= attempts; i++) {
    const { stdout } = await runCast(ctx, [
      "code",
      address,
      "--rpc-url",
      options.rpcUrl,
    ]);
    const code = stdout.trim();
    if (code.length > 0 && code !== "0x") {
      out.print("contract confirmed at %s", address);
      return;
    }
    if (i === attempts) {
      throw new Error(`timeout waiting for contract code at ${address}`);
    }
    await Bun.sleep(intervalMs);
  }
}

/** Propose, execute, verify code, and write an imutable deployment manifest. */
export async function runProvisionImutableAlg(
  out: Out,
  options: ProvisionImutableAlgOptions,
): Promise<ProvisionImutableAlgResult> {
  const from = privateKeyToAccount(options.deployKey).address;
  const proposalPath = path.join(
    options.proposalDir,
    `proposal-${options.bootstrapAlg}-${options.runId}.json`,
  );

  const proposeOptions: import("./options.js").ProposeImutableOptions = {
    univocityRoot: options.univocityRoot,
    workDir: options.workDir,
    create3: options.create3,
    forgeConfig: options.forgeConfig,
    buildRoot: options.buildRoot,
    outDir: options.outDir,
    srcDir: options.srcDir,
    cacheDir: options.cacheDir,
    libsDir: options.libsDir,
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    bootstrapAlg: options.bootstrapAlg,
    es256Generate: options.bootstrapAlg === "es256",
    ks256Generate: options.bootstrapAlg === "ks256",
    safePublish: false,
    from,
    signerRole: "deploy-key",
    deployKey: options.deployKey,
    rpcUrl: options.rpcUrl,
    releaseRoot: options.releaseRoot,
    outPath: proposalPath,
    createCallAddress: DEFAULT_CREATE_CALL,
    safeTxServiceUrl: DEFAULT_SAFE_TX_SERVICE_URL,
  };
  if (options.bootstrapAlg === "es256") {
    proposeOptions.es256PemOut = options.es256PemOut;
  }
  if (options.bootstrapAlg === "ks256") {
    proposeOptions.ks256KeyOut = options.ks256KeyOut;
  }

  await runProposeImutable(out, proposeOptions);

  await runExecuteProposal(out, {
    ...options,
    proposalFile: proposalPath,
    signer: { key: options.deployKey, address: from },
    rpcUrl: options.rpcUrl,
  });

  const proposal = parseProposal(await Bun.file(proposalPath).text());
  if (proposal.imutableUnivocity === null) {
    throw new Error(
      `proposal missing imutableUnivocity address after execute: ${proposalPath}`,
    );
  }
  const address = getAddress(proposal.imutableUnivocity);
  if (!options.skipCodeWait) {
    await waitForContractCode(out, options, address);
  }

  const manifest: ImutableDeploymentManifest = {
    kind: "imutable-deployment",
    version: 1,
    bootstrapAlg: options.bootstrapAlg,
    chainId: proposal.chainId,
    imutableUnivocity: address,
    publishMode: "eoa",
    from: getAddress(proposal.from),
  };
  const manifestPath = manifestPathFor(
    options.proposalDir,
    options.bootstrapAlg,
    proposal.chainId,
    address,
  );
  const pointerPath = pointerPathFor(
    options.proposalDir,
    options.runId,
    options.bootstrapAlg,
  );
  await writeImutableDeploymentManifest(manifestPath, manifest);
  await Bun.write(pointerPath, `${manifestPath}\n`);
  out.print("manifest: %s", manifestPath);
  out.out("%s", JSON.stringify(manifest, null, 2));

  return { manifestPath, pointerPath, manifest, proposalPath };
}
