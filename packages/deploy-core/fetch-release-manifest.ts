import { normalizeUnivocityReleaseTag } from "./release-tag.js";

export type GithubReleaseAsset = {
  name: string;
  url: string;
};

export type GithubRelease = {
  tag_name: string;
  assets: GithubReleaseAsset[];
};

export type FetchedReleaseManifest = {
  releaseTag: string;
  raw: string;
  sidecar: string;
};

export type FetchUnivocityReleaseManifestOptions = {
  org?: string;
  repo?: string;
  githubApi?: string;
};

const DEFAULT_ORG = "forestrie";
const DEFAULT_REPO = "univocity";
const DEFAULT_GITHUB_API = "https://api.github.com";

async function downloadGithubReleaseAsset(apiUrl: string): Promise<string> {
  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/octet-stream",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `GitHub asset download failed (${response.status}): ${body}`,
    );
  }
  return response.text();
}

function requireReleaseAsset(
  assets: GithubReleaseAsset[],
  exactName: string,
  releaseTag: string,
): GithubReleaseAsset {
  const found = assets.find((asset) => asset.name === exactName);
  if (found !== undefined) {
    return found;
  }
  const available = assets
    .map((asset) => asset.name)
    .filter((name) => name.startsWith("deploy-manifest-"))
    .sort();
  const hint = available.length === 0 ? "none" : available.join(", ");
  throw new Error(
    `release ${releaseTag} is missing asset ${exactName}; ` +
      `available deploy-manifest assets: ${hint}`,
  );
}

/**
 * Fetch deploy-manifest JSON + sha256 sidecar from a public GitHub release.
 * Intended for server-side callers (Pages Functions, Vite dev middleware).
 */
export async function fetchUnivocityReleaseManifest(
  releaseTagInput: string,
  options: FetchUnivocityReleaseManifestOptions = {},
): Promise<FetchedReleaseManifest> {
  const releaseTag = normalizeUnivocityReleaseTag(releaseTagInput);
  const org = options.org ?? DEFAULT_ORG;
  const repo = options.repo ?? DEFAULT_REPO;
  const githubApi = options.githubApi ?? DEFAULT_GITHUB_API;

  const releaseResponse = await fetch(
    `${githubApi}/repos/${org}/${repo}/releases/tags/${encodeURIComponent(releaseTag)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  if (!releaseResponse.ok) {
    throw new Error(
      `GitHub release ${releaseTag} not found (${releaseResponse.status})`,
    );
  }

  const release = (await releaseResponse.json()) as GithubRelease;
  const tag = release.tag_name;
  const manifestName = `deploy-manifest-${tag}.json`;
  const sidecarName = `${manifestName}.sha256`;
  const manifestAsset = requireReleaseAsset(release.assets, manifestName, tag);
  const sidecarAsset = requireReleaseAsset(release.assets, sidecarName, tag);

  const [raw, sidecar] = await Promise.all([
    downloadGithubReleaseAsset(manifestAsset.url),
    downloadGithubReleaseAsset(sidecarAsset.url),
  ]);

  return { releaseTag: tag, raw, sidecar };
}
