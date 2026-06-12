import type { Out } from "@univocity-tools/cli-kit/reporting";
import { runChecked } from "@univocity-tools/subprocess/run-checked";
import { runProcess } from "@univocity-tools/subprocess/run-process";
import type { BumpLevel, ReleaseIdOptions } from "./options.js";

/** Parsed components of a semver-shaped git tag (optional leading `v`). */
export type SemverParts = {
  /** Leading prefix on the source tag — `"v"` or `""` — preserved on output. */
  prefix: string;
  major: number;
  minor: number;
  patch: number;
};

/** Tag must be exactly `MAJOR.MINOR.PATCH`, optionally `v`-prefixed. */
const SEMVER_TAG_PATTERN = /^(v?)(\d+)\.(\d+)\.(\d+)$/;

/** Parse a semver-shaped tag; undefined when the tag is not semver. */
export function parseSemverTag(tag: string): SemverParts | undefined {
  const match = tag.trim().match(SEMVER_TAG_PATTERN);
  if (!match) {
    return undefined;
  }
  return {
    prefix: match[1] ?? "",
    major: Number(match[2]),
    minor: Number(match[3]),
    patch: Number(match[4]),
  };
}

/**
 * First semver-shaped tag from a creation-date-sorted (desc) list.
 *
 * Falls back to `v0.0.0` when no semver tag is present, matching the repo's
 * prevailing `v`-prefixed tag style.
 */
export function selectBaseVersion(tags: string[]): SemverParts {
  for (const tag of tags) {
    const parts = parseSemverTag(tag);
    if (parts) {
      return parts;
    }
  }
  return { prefix: "v", major: 0, minor: 0, patch: 0 };
}

/** Increment one semver level, resetting lower levels; prefix preserved. */
export function bumpVersion(
  parts: SemverParts,
  level: BumpLevel,
): SemverParts {
  switch (level) {
    case "major":
      return {
        prefix: parts.prefix,
        major: parts.major + 1,
        minor: 0,
        patch: 0,
      };
    case "minor":
      return {
        prefix: parts.prefix,
        major: parts.major,
        minor: parts.minor + 1,
        patch: 0,
      };
    case "patch":
      return {
        prefix: parts.prefix,
        major: parts.major,
        minor: parts.minor,
        patch: parts.patch + 1,
      };
  }
}

/** Render `SemverParts` back to `v0.1.1`. */
export function formatVersion(parts: SemverParts): string {
  return `${parts.prefix}${parts.major}.${parts.minor}.${parts.patch}`;
}

/** Two-digit UTC `YYMMDD` for the given date. */
export function formatBuildDate(date: Date): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/** Build id `YYMMDD-<short-commit>`. */
export function formatBuildId(date: Date, shortHash: string): string {
  return `${formatBuildDate(date)}-${shortHash}`;
}

/** Combined release id `version+build-id`. */
export function formatReleaseId(version: string, buildId: string): string {
  return `${version}+${buildId}`;
}

export type ResolveReleaseIdOptions = {
  /** Absolute path to the git checkout to read tags and HEAD from. */
  repoRoot: string;
  /** Optional semver bump applied to the base version. */
  bump?: BumpLevel | undefined;
  /** When true, skip the build id (no HEAD lookup) and return version only. */
  semverOnly?: boolean | undefined;
};

export type ResolvedReleaseId = {
  /** The semver version portion, e.g. `v0.1.1`. */
  version: string;
  /** `YYMMDD-<short-commit>`; omitted when `semverOnly`. */
  buildId?: string;
  /**
   * The combined `version+build-id`; equals `version` when `semverOnly`.
   */
  releaseId: string;
};

async function assertGitRepo(repoRoot: string): Promise<void> {
  const result = await runProcess([
    "git",
    "-C",
    repoRoot,
    "rev-parse",
    "--is-inside-work-tree",
  ]);
  if (result.exitCode !== 0 || result.stdout.trim() !== "true") {
    throw new Error(`${repoRoot} is not a git repository`);
  }
}

/**
 * Derive the release id from a git checkout.
 *
 * Selects the most recent semver-shaped tag (by creation date), applies an
 * optional bump, and (unless `semverOnly`) appends a build id from the current
 * UTC date and the abbreviated HEAD commit.
 */
export async function resolveReleaseId(
  out: Out,
  options: ResolveReleaseIdOptions,
): Promise<ResolvedReleaseId> {
  const { repoRoot } = options;
  await assertGitRepo(repoRoot);

  const tagResult = await runChecked(out, [
    "git",
    "-C",
    repoRoot,
    "tag",
    "--sort=-creatordate",
  ]);
  const tags = tagResult.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let parts = selectBaseVersion(tags);
  if (options.bump) {
    parts = bumpVersion(parts, options.bump);
  }
  const version = formatVersion(parts);

  if (options.semverOnly) {
    return { version, releaseId: version };
  }

  const headResult = await runChecked(out, [
    "git",
    "-C",
    repoRoot,
    "rev-parse",
    "--short",
    "HEAD",
  ]);
  const shortHash = headResult.stdout.trim();
  const buildId = formatBuildId(new Date(), shortHash);
  return { version, buildId, releaseId: formatReleaseId(version, buildId) };
}

/** Print the release id (or just the version with `--semver`) to stdout. */
export async function runReleaseId(
  out: Out,
  options: ReleaseIdOptions,
): Promise<void> {
  const resolved = await resolveReleaseId(out, {
    repoRoot: options.univocityRoot,
    bump: options.bump,
    semverOnly: options.semverOnly,
  });
  out.out("%s", options.semverOnly ? resolved.version : resolved.releaseId);
}
