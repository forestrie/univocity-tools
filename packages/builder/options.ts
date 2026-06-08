import type { LooseParsedArgs } from "@univocity-tools/cli-kit";
import type { FoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import type { ForgeOptions } from "@univocity-tools/forge-options/options";
import { parseForgeOptions } from "@univocity-tools/forge-options/options";
import { resolveContractsCheckoutRootEager } from "./contracts-checkout-root.js";

/** Flags shared by every builder command (after parsing). */
export type BuilderCommonOptions = {
  verbose: boolean;
  /** Contracts checkout root — always an absolute path after parsing. */
  univocityRoot: string;
} & ForgeOptions &
  FoundryBinOptions;

/** Options for `builder validate batch`. */
export type ValidateBatchOptions = BuilderCommonOptions & {
  path: string;
};

type CommonArgSlice = {
  verbose?: boolean | undefined;
  univocityRoot?: string | undefined;
  "univocity-root"?: string | undefined;
  forgeConfig?: string | undefined;
  "forge-config"?: string | undefined;
  foundryOut?: string | undefined;
  "foundry-out"?: string | undefined;
  forgeBin?: string | undefined;
  "forge-bin"?: string | undefined;
  castBin?: string | undefined;
  "cast-bin"?: string | undefined;
};

export function parseBuilderCommonOptions(
  args: CommonArgSlice,
): BuilderCommonOptions {
  const univocityRoot = resolveContractsCheckoutRootEager(args);
  return {
    verbose: args.verbose ?? false,
    univocityRoot,
    ...parseForgeOptions(args, univocityRoot),
    ...parseFoundryBinOptions(args),
  };
}

export function parseValidateBatchOptions(
  args: LooseParsedArgs,
): ValidateBatchOptions {
  const rawPath = args.path ?? args._?.[0];
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    throw new Error("batch path is required");
  }
  return {
    ...parseBuilderCommonOptions(args as CommonArgSlice),
    path: rawPath,
  };
}
