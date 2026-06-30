import type { ContractRelease } from "./contract-release.js";
import type { ContractReleaseChannel } from "./contract-release-channel.js";
import {
  compareSemver,
  parseSemverTag,
  satisfiesCaretRange,
} from "./semver-range.js";

function compareSemverTags(a: string, b: string): number {
  const left = parseSemverTag(a);
  const right = parseSemverTag(b);
  if (!left || !right) {
    throw new Error(`cannot compare non-semver release tags: ${a} vs ${b}`);
  }
  return compareSemver(left, right);
}

export type ResolveContractReleaseOptions = {
  semverRange: string;
  channel: ContractReleaseChannel;
};

/**
 * Select the newest contract release matching a caret semver range and channel.
 * Entries without `channel` never match when a channel filter is supplied.
 */
export function resolveContractReleaseBySemverAndChannel(
  releases: ContractRelease[],
  options: ResolveContractReleaseOptions,
): ContractRelease | undefined {
  const matches = releases.filter((release) => {
    if (release.channel !== options.channel) {
      return false;
    }
    return satisfiesCaretRange(release.version, options.semverRange);
  });
  if (matches.length === 0) {
    return undefined;
  }
  return matches.sort((left, right) =>
    compareSemverTags(right.version, left.version),
  )[0];
}
