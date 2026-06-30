/** Deployment channel for a published Univocity contract release. */
export type ContractReleaseChannel = "dev" | "stg" | "prod";

const RELEASE_CHANNELS: ReadonlySet<string> = new Set(["dev", "stg", "prod"]);

/** True when `value` is a supported contract release channel. */
export function isContractReleaseChannel(
  value: string,
): value is ContractReleaseChannel {
  return RELEASE_CHANNELS.has(value);
}

/** Parse and validate a contract release channel string. */
export function parseContractReleaseChannel(
  raw: unknown,
): ContractReleaseChannel {
  if (typeof raw !== "string" || !isContractReleaseChannel(raw)) {
    throw new Error("channel must be one of: dev, stg, prod");
  }
  return raw;
}
