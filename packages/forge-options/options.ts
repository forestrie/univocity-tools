import path from "node:path";

export const DEFAULT_FORGE_CONFIG = "foundry.toml";

/** Parsed forge options — `forgeConfig` is always an absolute path. */
export type ForgeOptions = {
  forgeConfig: string;
};

export type ForgeArgSlice = {
  forgeConfig?: string | undefined;
  "forge-config"?: string | undefined;
};

/** Resolve a forge config path relative to the contracts checkout root. */
export function resolveForgeConfigPath(
  raw: string | undefined,
  univocityRoot: string,
): string {
  return path.resolve(univocityRoot, raw ?? DEFAULT_FORGE_CONFIG);
}

export function parseForgeOptions(
  args: ForgeArgSlice,
  univocityRoot: string,
): ForgeOptions {
  const raw = args.forgeConfig ?? args["forge-config"];
  return {
    forgeConfig: resolveForgeConfigPath(raw, univocityRoot),
  };
}
