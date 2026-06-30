/** Parsed semver components (optional leading `v`). */
export type SemverParts = {
  prefix: string;
  major: number;
  minor: number;
  patch: number;
};

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

/** Compare two parsed semver parts (negative when a < b). */
export function compareSemver(a: SemverParts, b: SemverParts): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

/**
 * True when `version` satisfies a caret semver range (`^MAJOR.MINOR.PATCH`).
 * Pre-release build ids are not supported; tags must be plain semver.
 */
export function satisfiesCaretRange(version: string, range: string): boolean {
  const trimmedRange = range.trim();
  if (!trimmedRange.startsWith("^")) {
    throw new Error(`unsupported semver range (caret required): ${range}`);
  }
  const rangeParts = parseSemverTag(trimmedRange.slice(1));
  const versionParts = parseSemverTag(version);
  if (!rangeParts || !versionParts) {
    return false;
  }
  if (compareSemver(versionParts, rangeParts) < 0) {
    return false;
  }
  if (rangeParts.major > 0) {
    return versionParts.major === rangeParts.major;
  }
  if (rangeParts.minor > 0) {
    return versionParts.major === 0 && versionParts.minor === rangeParts.minor;
  }
  return (
    versionParts.major === 0 &&
    versionParts.minor === 0 &&
    versionParts.patch >= rangeParts.patch
  );
}
