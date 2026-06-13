export type AuthKind = "gh-cli" | "env";

export const DEFAULT_AUTH_KIND: AuthKind = "gh-cli";

const AUTH_KINDS = new Set<AuthKind>(["gh-cli", "env"]);

/** Normalize and validate an auth-kind string. */
export function normalizeAuthKind(raw: string | undefined): AuthKind {
  const value = raw?.trim().toLowerCase();
  if (value === undefined || value.length === 0) {
    return DEFAULT_AUTH_KIND;
  }
  if (!AUTH_KINDS.has(value as AuthKind)) {
    throw new Error(`invalid auth kind "${raw}"; expected gh-cli or env`);
  }
  return value as AuthKind;
}
