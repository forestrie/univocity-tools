import type { LooseParsedArgs } from "@univocity-tools/cli-kit";
import type { Create3Config } from "@univocity-tools/create3-options/create3-config";
import { parseCreate3Options } from "@univocity-tools/create3-options/options";
import type { FoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import type { ForgeOptions } from "@univocity-tools/forge-options/options";
import { parseForgeOptions } from "@univocity-tools/forge-options/options";
import { resolveContractsCheckoutRootEager } from "@univocity-tools/builder-common/contracts-checkout-root";
import type { Hex } from "viem";
import {
  resolveCreate3Salt,
  resolvePrivateKey,
  resolveRpcUrl,
} from "./create3-deploy-helpers.js";

/** Flags shared by every deployer command (after parsing). */
export type DeployerCommonOptions = {
  verbose: boolean;
  /** Contracts checkout root — always an absolute path after parsing. */
  univocityRoot: string;
  create3: Create3Config;
} & ForgeOptions &
  FoundryBinOptions;

type CommonArgSlice = {
  verbose?: boolean | undefined;
  univocityRoot?: string | undefined;
  "univocity-root"?: string | undefined;
  forgeConfig?: string | undefined;
  "forge-config"?: string | undefined;
  foundryOut?: string | undefined;
  "foundry-out"?: string | undefined;
  create3Config?: string | undefined;
  "create3-config"?: string | undefined;
  forgeBin?: string | undefined;
  "forge-bin"?: string | undefined;
  castBin?: string | undefined;
  "cast-bin"?: string | undefined;
};

export function parseDeployerCommonOptions(
  args: CommonArgSlice,
): DeployerCommonOptions {
  const univocityRoot = resolveContractsCheckoutRootEager(args);
  return {
    verbose: args.verbose ?? false,
    univocityRoot,
    create3: parseCreate3Options(args),
    ...parseForgeOptions(args, univocityRoot),
    ...parseFoundryBinOptions(args),
  };
}

export type ConfigShowOptions = DeployerCommonOptions;

export function parseConfigShowOptions(
  args: LooseParsedArgs,
): ConfigShowOptions {
  return parseDeployerCommonOptions(args as CommonArgSlice);
}

export type DeployCreate3Options = DeployerCommonOptions & {
  rpcUrl: string;
  privateKey: Hex;
  create3Salt: string;
};

type DeployCreate3ArgSlice = CommonArgSlice & {
  rpcUrl?: string | undefined;
  "rpc-url"?: string | undefined;
  privateKey?: string | undefined;
  "private-key"?: string | undefined;
  create3Salt?: string | undefined;
  "create3-salt"?: string | undefined;
};

export function parseDeployCreate3Options(
  args: LooseParsedArgs,
): DeployCreate3Options {
  const slice = args as DeployCreate3ArgSlice;
  return {
    ...parseDeployerCommonOptions(slice),
    rpcUrl: resolveRpcUrl(slice),
    privateKey: resolvePrivateKey(slice),
    create3Salt: resolveCreate3Salt(slice),
  };
}
