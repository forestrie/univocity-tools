import { univocityManifestUrls } from "./manifest-verify.js";
import { normalizeUnivocityReleaseTag } from "./release-tag.js";

export type FetchedReleaseManifest = {
  releaseTag: string;
  raw: string;
  sidecar: string;
};

export type FetchUnivocityReleaseManifestOptions = {
  releasesBase?: string;
};

async function downloadReleaseAsset(
  url: string,
  label: string,
): Promise<string> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`${label} download failed (${response.status}): ${url}`);
  }
  return response.text();
}

/**
 * Fetch deploy-manifest JSON + sha256 sidecar from a public GitHub release.
 * Uses release download URLs (server-side only — browser CORS blocks these).
 */
export async function fetchUnivocityReleaseManifest(
  releaseTagInput: string,
  options: FetchUnivocityReleaseManifestOptions = {},
): Promise<FetchedReleaseManifest> {
  const releaseTag = normalizeUnivocityReleaseTag(releaseTagInput);
  const { manifestUrl, sidecarUrl } = univocityManifestUrls(
    releaseTag,
    options.releasesBase,
  );

  const [raw, sidecar] = await Promise.all([
    downloadReleaseAsset(manifestUrl, "manifest"),
    downloadReleaseAsset(sidecarUrl, "sidecar"),
  ]);

  return { releaseTag, raw, sidecar };
}
