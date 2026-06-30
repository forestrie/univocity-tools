import type { LooseParsedArgs } from "@univocity-tools/cli-kit";
import {
  parseCommonOptions,
  readEvaluatedStringOption,
  resolveReleaseRoot,
} from "@univocity-tools/cli-kit";
import path from "node:path";
import type { FoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import type { ForgeOptions } from "@univocity-tools/forge-options/options";
import { parseForgeOptions } from "@univocity-tools/forge-options/options";
import type { GitOptions } from "@univocity-tools/git-options/options";
import { parseGitOptions } from "@univocity-tools/git-options/options";

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
  /** Explicit release id to append to the archive base name, if provided. */
  releaseId?: string | undefined;
  /** When true (flag passed without a value), derive the release id from git. */
  autoReleaseId: boolean;
};

/** Semver level to increment when deriving the release id. */
export type BumpLevel = "major" | "minor" | "patch";

/** Options for `contract-artefacts list-releases`. */
export type ListReleasesOptions = CartCommonOptions;

/** Options for `contract-artefacts release-id`. */
export type ReleaseIdOptions = CartCommonOptions & {
  /** Optional bump applied to the most recent semver tag. */
  bump?: BumpLevel | undefined;
  /** When true, print only the semver version (no build id). */
  semverOnly: boolean;
};

/** Options for `contract-artefacts archive-extract`. */
export type ArchiveExtractOptions = CartCommonOptions & {
  /** Absolute path to the archive file (under workDir). */
  archive: string;
  /** Absolute path to extract and hydrate into. */
  releaseRoot: string;
};

/** Options for `contract-artefacts archive-validate`. */
export type ArchiveValidateOptions = CartCommonOptions & {
  /** Absolute path to the release root to validate. */
  releaseRoot: string;
};

/** Options for `contract-artefacts fetch-release`. */
export type FetchReleaseOptions = {
  univocityRoot: string;
  workDir: string;
} & GitOptions & {
    artefact?: string | undefined;
    releaseTag?: string | undefined;
  };

/** Options for `contract-artefacts fetch-run`. */
export type FetchRunOptions = {
  univocityRoot: string;
  workDir: string;
} & GitOptions & {
    artefact?: string | undefined;
    runId?: string | undefined;
    branch?: string | undefined;
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

  const releaseIdPresent = "release-id" in args || "releaseId" in args;
  const releaseIdValue = readEvaluatedStringOption(
    args as Record<string, unknown>,
    "release-id",
  )?.trim();
  const hasExplicitReleaseId =
    releaseIdValue !== undefined && releaseIdValue.length > 0;

  return {
    ...parseCartCommonOptions(args as CommonArgSlice),
    archiveName,
    releaseId: hasExplicitReleaseId ? releaseIdValue : undefined,
    autoReleaseId: releaseIdPresent && !hasExplicitReleaseId,
  };
}

function booleanFlag(
  args: LooseParsedArgs,
  kebab: string,
  camel: string,
): boolean {
  return args[kebab] === true || args[camel] === true;
}

export function parseListReleasesOptions(
  args: LooseParsedArgs,
): ListReleasesOptions {
  return parseCartCommonOptions(args as CommonArgSlice);
}

export function parseReleaseIdOptions(
  args: LooseParsedArgs,
): ReleaseIdOptions {
  const levels = new Set<BumpLevel>();
  if (booleanFlag(args, "next-major", "nextMajor")) {
    levels.add("major");
  }
  if (
    booleanFlag(args, "next-minor", "nextMinor") ||
    booleanFlag(args, "next", "next")
  ) {
    levels.add("minor");
  }
  if (booleanFlag(args, "next-patch", "nextPatch")) {
    levels.add("patch");
  }
  if (levels.size > 1) {
    throw new Error("--next-* flags are mutually exclusive");
  }

  const [bump] = levels;
  return {
    ...parseCartCommonOptions(args as CommonArgSlice),
    bump,
    semverOnly: booleanFlag(args, "semver", "semver"),
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

  return {
    ...common,
    archive: path.resolve(common.workDir, rawArchive),
    releaseRoot: resolveReleaseRoot(args) ?? process.cwd(),
  };
}

export function parseArchiveValidateOptions(
  args: LooseParsedArgs,
): ArchiveValidateOptions {
  const common = parseCartCommonOptions(args as CommonArgSlice);

  return {
    ...common,
    releaseRoot: resolveReleaseRoot(args) ?? process.cwd(),
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

type FetchCommonArgSlice = {
  sourceRoot?: string | undefined;
  "source-root"?: string | undefined;
  workDir?: string | undefined;
  "work-dir"?: string | undefined;
  org?: string | undefined;
  repo?: string | undefined;
  workflow?: string | undefined;
  authKind?: string | undefined;
  "auth-kind"?: string | undefined;
  artefact?: string | undefined;
};

function parseFetchCommonOptions(
  args: FetchCommonArgSlice,
): { univocityRoot: string; workDir: string } & GitOptions {
  const common = parseCommonOptions(args, {
    gitRepoName: UNIVOCITY_GIT_REPO_NAME,
  });
  return {
    univocityRoot: common.sourceRoot,
    workDir: common.workDir,
    ...parseGitOptions(args),
  };
}

function optionalTrimmed(
  args: LooseParsedArgs,
  optionName: string,
): string | undefined {
  const raw = readEvaluatedStringOption(
    args as Record<string, unknown>,
    optionName,
  )?.trim();
  return raw !== undefined && raw.length > 0 ? raw : undefined;
}

export function parseFetchReleaseOptions(
  args: LooseParsedArgs,
): FetchReleaseOptions {
  return {
    ...parseFetchCommonOptions(args as FetchCommonArgSlice),
    artefact: optionalTrimmed(args, "artefact"),
    releaseTag: optionalTrimmed(args, "release"),
  };
}

export function parseFetchRunOptions(args: LooseParsedArgs): FetchRunOptions {
  return {
    ...parseFetchCommonOptions(args as FetchCommonArgSlice),
    artefact: optionalTrimmed(args, "artefact"),
    runId: optionalTrimmed(args, "run-id"),
    branch: optionalTrimmed(args, "branch"),
  };
}
