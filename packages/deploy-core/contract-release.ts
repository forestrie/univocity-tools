import type { ContractReleaseChannel } from "./contract-release-channel.js";

/** One published Univocity contract release and deployed addresses. */
export type ContractRelease = {
  version: string;
  /** Deployment channel when recorded in deployment.json or release catalog. */
  channel?: ContractReleaseChannel;
  es256Address?: string;
  ks256Address?: string;
};
