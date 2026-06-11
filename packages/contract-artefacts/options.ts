import type { LooseParsedArgs } from "@univocity-tools/cli-kit";
import {
  parseCommonOptions,
  readEvaluatedStringOption,
} from "@univocity-tools/cli-kit";
import path from "node:path";
import type { FoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import type { ForgeOptions } from "@univocity-tools/forge-options/options";
import { parseForgeOptions } from "@univocity-tools/forge-options/options";

/** Contracts repo checkout — the univocity-specific name for `sourceRoot`. */
export const UNIVOCITY_GIT_REPO_NAME = "univocity";

/** Flags shared by every Cart command (after parsing). */
export type CartCommonOptions = {
  /** Contracts checkout root — absolute path after parsing. */
  univocityRoot: string;
  workDir: string;
} & ForgeOptions &
  FoundryBinOptions;

/** Options for `contract-artefacts validate batch`. */
export type ValidateBatchOptions = CartCommonOptions & {
  path: string;
};

/** Options for `contract-artefacts archive`. */
export type ArchiveOptions = CartCommonOptions & {
  archiveName: string;
};

/** Options for `contract-artefacts archive-extract`. */
export type ArchiveExtractOptions = CartCommonOptions & {
  /** Absolute path to the archive file (under workDir). */
  archive: string;
  /** Absolute path to extract and hydrate into. */
  releaseRoot: string;
};

type CommonArgSlice = {
  sourceRoot?: string | undefined;
  "source-root"?: string | undefined;
  workDir?: string | undefined;
  "work-dir"?: string | undefined;
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
  forgeBin?: string | undefined;
  "forge-bin"?: string | undefined;
  castBin?: string | undefined;
  "cast-bin"?: string | undefined;
};

export function parseCartCommonOptions(
  args: CommonArgSlice,
): CartCommonOptions {
  const common = parseCommonOptions(args, {
    gitRepoName: UNIVOCITY_GIT_REPO_NAME,
  });
  return {
    univocityRoot: common.sourceRoot,
    workDir: common.workDir,
    ...parseForgeOptions(args, common.sourceRoot),
    ...parseFoundryBinOptions(args),
  };
}

export const DEFAULT_ARCHIVE_NAME = "build";

export function parseArchiveOptions(args: LooseParsedArgs): ArchiveOptions {
  const rawName = args["archive-name"] ?? args.archiveName;
  const archiveName =
    typeof rawName === "string" && rawName.trim().length > 0
      ? rawName.trim()
      : DEFAULT_ARCHIVE_NAME;
  return {
    ...parseCartCommonOptions(args as CommonArgSlice),
    archiveName,
  };
}

export function parseArchiveExtractOptions(
  args: LooseParsedArgs,
): ArchiveExtractOptions {
  const rawArchive = args.archive ?? args._?.[0];
  if (typeof rawArchive !== "string" || rawArchive.length === 0) {
    throw new Error("archive path is required");
  }

  const common = parseCartCommonOptions(args as CommonArgSlice);
  const rawReleaseRoot = readEvaluatedStringOption(
    args as Record<string, unknown>,
    "release-root",
  );

  return {
    ...common,
    archive: path.resolve(common.workDir, rawArchive),
    releaseRoot: path.resolve(rawReleaseRoot ?? process.cwd()),
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
    ...parseCartCommonOptions(args as CommonArgSlice),
    path: rawPath,
  };
}
