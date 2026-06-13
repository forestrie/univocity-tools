import { readEvaluatedStringOption } from "@univocity-tools/cli-kit";

export const DEFAULT_GITHUB_ORG = "forestrie";
export const DEFAULT_GITHUB_REPO = "univocity";
export const DEFAULT_WORKFLOW = "release.yml";
export const DEFAULT_AUTH_KIND = "gh-cli";

/** How to obtain a GitHub API token. */
export type AuthKind = "gh-cli" | "env";

/** Parsed git/GitHub options (after citty arg parsing). */
export type GitOptions = {
  org: string;
  repo: string;
  workflow: string;
  authKind: AuthKind;
};

export type GitArgSlice = {
  org?: string | undefined;
  repo?: string | undefined;
  workflow?: string | undefined;
  authKind?: string | undefined;
  "auth-kind"?: string | undefined;
};

const AUTH_KINDS = new Set<AuthKind>(["gh-cli", "env"]);

/** Normalize and validate an auth-kind string. */
export function normalizeAuthKind(raw: string | undefined): AuthKind {
  const value = raw?.trim().toLowerCase();
  if (value === undefined || value.length === 0) {
    return DEFAULT_AUTH_KIND;
  }
  if (!AUTH_KINDS.has(value as AuthKind)) {
    throw new Error(`invalid --auth-kind "${raw}"; expected gh-cli or env`);
  }
  return value as AuthKind;
}

function readStringArg(
  args: GitArgSlice,
  optionName: string,
  fallback: string,
): string {
  const raw = readEvaluatedStringOption(
    args as Record<string, unknown>,
    optionName,
  );
  const trimmed = raw?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : fallback;
}

export function parseGitOptions(args: GitArgSlice): GitOptions {
  return {
    org: readStringArg(args, "org", DEFAULT_GITHUB_ORG),
    repo: readStringArg(args, "repo", DEFAULT_GITHUB_REPO),
    workflow: readStringArg(args, "workflow", DEFAULT_WORKFLOW),
    authKind: normalizeAuthKind(
      readEvaluatedStringOption(args as Record<string, unknown>, "auth-kind"),
    ),
  };
}
