import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  requireCastBin,
  toFoundryExecContext,
  type FoundryExecContext,
} from "@univocity-tools/foundry-exec/require-bins";
import { runCast } from "@univocity-tools/foundry-exec/spawn";
import { getAddress, type Address } from "viem";
import type { BootstrapAlg } from "./bootstrap-key.js";
import { ALG_ES256, ALG_KS256 } from "./deploy-constants.js";
import type { ImutableDeploymentManifest } from "./imutable-deployment-manifest.js";
import type { FoundryBinOptions } from "@univocity-tools/foundry-exec/options";

const BOOTSTRAP_CONFIG_SELECTOR = "bootstrapConfig()(int64,bytes)";

export type VerifyImutableBootstrapOptions = FoundryBinOptions & {
  univocityRoot: string;
  rpcUrl: string;
};

function expectedAlgValue(alg: BootstrapAlg): bigint {
  return alg === "es256" ? ALG_ES256 : ALG_KS256;
}

async function readContractCode(
  ctx: FoundryExecContext,
  rpcUrl: string,
  address: Address,
): Promise<string> {
  const { stdout } = await runCast(ctx, [
    "code",
    address,
    "--rpc-url",
    rpcUrl,
  ]);
  return stdout.trim();
}

async function readOnChainBootstrapAlg(
  ctx: FoundryExecContext,
  rpcUrl: string,
  address: Address,
): Promise<bigint> {
  const { stdout } = await runCast(ctx, [
    "call",
    address,
    BOOTSTRAP_CONFIG_SELECTOR,
    "--rpc-url",
    rpcUrl,
  ]);
  const firstLine = stdout.trim().split("\n")[0]?.trim() ?? "";
  const token = firstLine.split(/\s+/)[0] ?? "";
  if (!/^-?\d+$/.test(token)) {
    throw new Error(
      `bootstrapConfig() returned unexpected output at ${address}: ${stdout.trim()}`,
    );
  }
  return BigInt(token);
}

/** Assert on-chain bootstrap alg matches the manifest bootstrap alg variant. */
export async function verifyImutableBootstrap(
  out: Out,
  options: VerifyImutableBootstrapOptions,
  manifest: ImutableDeploymentManifest,
): Promise<void> {
  requireCastBin(options);
  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    out,
    cwd: options.univocityRoot,
  });
  const address = getAddress(manifest.imutableUnivocity);
  const code = await readContractCode(ctx, options.rpcUrl, address);
  if (code.length === 0 || code === "0x") {
    throw new Error(`no contract code at ${address}`);
  }
  const onChainAlg = await readOnChainBootstrapAlg(
    ctx,
    options.rpcUrl,
    address,
  );
  const expected = expectedAlgValue(manifest.bootstrapAlg);
  if (onChainAlg !== expected) {
    throw new Error(
      `bootstrap alg mismatch at ${address}: manifest ${manifest.bootstrapAlg} expects ${expected}, on-chain ${onChainAlg}`,
    );
  }
  out.print(
    "bootstrapConfig OK at %s (%s, alg=%s)",
    address,
    manifest.bootstrapAlg,
    onChainAlg.toString(),
  );
}

/** Assert es256 and ks256 manifests reference distinct contract addresses. */
export function verifyImutableBootstrapPair(
  es256: ImutableDeploymentManifest,
  ks256: ImutableDeploymentManifest,
): void {
  const left = getAddress(es256.imutableUnivocity).toLowerCase();
  const right = getAddress(ks256.imutableUnivocity).toLowerCase();
  if (left === right) {
    throw new Error(
      `es256 and ks256 must deploy to different addresses (both ${left})`,
    );
  }
}
