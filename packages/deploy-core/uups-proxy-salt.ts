/** Salt-scheme version segment in counterfactual UUPS proxy salt strings. */
export const UUPS_PROXY_SALT_SCHEME_VERSION = "v1" as const;

const UUPS_PROXY_SALT_PREFIX =
  `forestrie.eth/univocity/UUPSUnivocity/${UUPS_PROXY_SALT_SCHEME_VERSION}/` as const;

/**
 * Normalize a forest logId (UUID with dashes or 32-char hex) to lowercase hex32
 * with no `0x` prefix or dashes — the canopy wire format for salt derivation.
 */
export function logIdToHex32(logId: string): string {
  const stripped = logId.trim().replace(/^0x/i, "").replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(stripped)) {
    throw new Error(
      `logId must be a UUID or 32-char hex string; got ${JSON.stringify(logId)}`,
    );
  }
  return stripped.toLowerCase();
}

/**
 * Canonical CREATE3 proxy salt string for counterfactual UUPSUnivocity deploys.
 * Cross-repo contract with the canopy verifier (ADR-0042).
 */
export function uupsProxySaltString(logId: string): string {
  return `${UUPS_PROXY_SALT_PREFIX}${logIdToHex32(logId)}`;
}
