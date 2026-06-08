import { evaluateOptionValue } from "@univocity-tools/cli-kit";
import path from "node:path";

export const DEFAULT_FORGE_CONFIG = "foundry.toml";
export const DEFAULT_FORGE_OUT = "out";

/** Parsed forge options — paths are always absolute after parsing. */
export type ForgeOptions = {
  forgeConfig: string;
  outDir: string;
};

export type ForgeArgSlice = {
  forgeConfig?: string | undefined;
  "forge-config"?: string | undefined;
  foundryOut?: string | undefined;
  "foundry-out"?: string | undefined;
};

/** Resolve a forge config path relative to the contracts checkout root. */
export function resolveForgeConfigPath(
  raw: string | undefined,
  univocityRoot: string,
): string {
  return path.resolve(univocityRoot, raw ?? DEFAULT_FORGE_CONFIG);
}

/** Resolve forge out dir relative to the forge config file directory. */
export function resolveForgeOutDir(
  raw: string | undefined,
  forgeConfigPath: string,
): string {
  return path.resolve(path.dirname(forgeConfigPath), raw ?? DEFAULT_FORGE_OUT);
}

export function parseForgeOptions(
  args: ForgeArgSlice,
  univocityRoot: string,
): ForgeOptions {
  const forgeConfig = resolveForgeConfigPath(
    evaluateOptionValue(
      "forge-config",
      args.forgeConfig ?? args["forge-config"],
    ),
    univocityRoot,
  );
  return {
    forgeConfig,
    outDir: resolveForgeOutDir(
      evaluateOptionValue(
        "foundry-out",
        args.foundryOut ?? args["foundry-out"],
      ),
      forgeConfig,
    ),
  };
}
