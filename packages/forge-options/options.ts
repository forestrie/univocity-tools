import { evaluateOptionValue } from "@univocity-tools/cli-kit";
import path from "node:path";

export const DEFAULT_FORGE_CONFIG = "foundry.toml";
export const DEFAULT_FORGE_OUT = "out";
export const DEFAULT_FORGE_SRC = "src";
export const DEFAULT_FORGE_CACHE = "cache";
export const DEFAULT_FORGE_LIBS = "lib";

/** Parsed forge options — paths are always absolute after parsing. */
export type ForgeOptions = {
  forgeConfig: string;
  /** Base directory the artifact dirs resolve against (forge config dir). */
  buildRoot: string;
  outDir: string;
  srcDir: string;
  cacheDir: string;
  libsDir: string;
};

export type ForgeArgSlice = {
  forgeConfig?: string | undefined;
  "forge-config"?: string | undefined;
  buildRoot?: string | undefined;
  "build-root"?: string | undefined;
  foundryOut?: string | undefined;
  "foundry-out"?: string | undefined;
  foundrySrc?: string | undefined;
  "foundry-src"?: string | undefined;
  foundryCache?: string | undefined;
  "foundry-cache"?: string | undefined;
  foundryLibs?: string | undefined;
  "foundry-libs"?: string | undefined;
};

/** Resolve a forge config path relative to the source root. */
export function resolveForgeConfigPath(
  raw: string | undefined,
  sourceRoot: string,
): string {
  return path.resolve(sourceRoot, raw ?? DEFAULT_FORGE_CONFIG);
}

/** Resolve the build root, defaulting to the forge config file directory. */
export function resolveBuildRoot(
  raw: string | undefined,
  forgeConfigPath: string,
): string {
  return path.resolve(path.dirname(forgeConfigPath), raw ?? ".");
}

/** Resolve a forge artifact dir relative to the build root. */
export function resolveBuildRootDir(
  raw: string | undefined,
  buildRoot: string,
  fallback: string,
): string {
  return path.resolve(buildRoot, raw ?? fallback);
}

export function parseForgeOptions(
  args: ForgeArgSlice,
  sourceRoot: string,
): ForgeOptions {
  const forgeConfig = resolveForgeConfigPath(
    evaluateOptionValue(
      "forge-config",
      args.forgeConfig ?? args["forge-config"],
    ),
    sourceRoot,
  );
  const buildRoot = resolveBuildRoot(
    evaluateOptionValue("build-root", args.buildRoot ?? args["build-root"]),
    forgeConfig,
  );
  return {
    forgeConfig,
    buildRoot,
    outDir: resolveBuildRootDir(
      evaluateOptionValue(
        "foundry-out",
        args.foundryOut ?? args["foundry-out"],
      ),
      buildRoot,
      DEFAULT_FORGE_OUT,
    ),
    srcDir: resolveBuildRootDir(
      evaluateOptionValue(
        "foundry-src",
        args.foundrySrc ?? args["foundry-src"],
      ),
      buildRoot,
      DEFAULT_FORGE_SRC,
    ),
    cacheDir: resolveBuildRootDir(
      evaluateOptionValue(
        "foundry-cache",
        args.foundryCache ?? args["foundry-cache"],
      ),
      buildRoot,
      DEFAULT_FORGE_CACHE,
    ),
    libsDir: resolveBuildRootDir(
      evaluateOptionValue(
        "foundry-libs",
        args.foundryLibs ?? args["foundry-libs"],
      ),
      buildRoot,
      DEFAULT_FORGE_LIBS,
    ),
  };
}
