import {
  UNIVOCITY_GITHUB_ORG,
  UNIVOCITY_GITHUB_REPO,
} from "./deploy-constants.js";
import {
  isLatestReleaseTag,
  normalizeUnivocityReleaseTag,
} from "./release-tag.js";

export type FetchLatestUnivocityReleaseTagOptions = {
  org?: string;
  repo?: string;
};

/** Query GitHub for the newest Univocity release tag (public API, no auth). */
export async function fetchLatestUnivocityReleaseTag(
  options: FetchLatestUnivocityReleaseTagOptions = {},
): Promise<string> {
  const org = options.org ?? UNIVOCITY_GITHUB_ORG;
  const repo = options.repo ?? UNIVOCITY_GITHUB_REPO;
  const response = await fetch(
    `https://api.github.com/repos/${org}/${repo}/releases/latest`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "univocity-tools-deploy",
      },
    },
  );
  if (!response.ok) {
    throw new Error(
      `GitHub latest release lookup failed (${response.status}) for ${org}/${repo}`,
    );
  }
  const json = (await response.json()) as { tag_name?: string };
  const tagName = json.tag_name?.trim();
  if (tagName === undefined || tagName.length === 0) {
    throw new Error("GitHub latest release response missing tag_name");
  }
  return normalizeUnivocityReleaseTag(tagName);
}

/** Resolve `latest` or normalize a concrete release tag for manifest fetch. */
export async function resolveUnivocityReleaseTag(
  input: string,
  options: FetchLatestUnivocityReleaseTagOptions = {},
): Promise<string> {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new Error("release tag is required");
  }
  if (isLatestReleaseTag(trimmed)) {
    return fetchLatestUnivocityReleaseTag(options);
  }
  return normalizeUnivocityReleaseTag(trimmed);
}
