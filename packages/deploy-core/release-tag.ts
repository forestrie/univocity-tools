/** Normalize user input to a Univocity GitHub release tag (e.g. `0.1.4` → `v0.1.4`). */
export function normalizeUnivocityReleaseTag(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("release tag is required");
  }
  if (trimmed.startsWith("v")) {
    return trimmed;
  }
  if (/^\d+\.\d+/.test(trimmed)) {
    return `v${trimmed}`;
  }
  return trimmed;
}
