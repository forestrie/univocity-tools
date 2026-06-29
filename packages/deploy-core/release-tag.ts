/** True when the user asked for the newest published GitHub release. */
export function isLatestReleaseTag(input: string): boolean {
  return input.trim().toLowerCase() === "latest";
}

/** Normalize user input to a Univocity GitHub release tag (e.g. `0.1.4` → `v0.1.4`). */
export function normalizeUnivocityReleaseTag(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("release tag is required");
  }
  if (isLatestReleaseTag(trimmed)) {
    return "latest";
  }
  if (trimmed.startsWith("v")) {
    return trimmed;
  }
  if (/^\d+\.\d+/.test(trimmed)) {
    return `v${trimmed}`;
  }
  return trimmed;
}
