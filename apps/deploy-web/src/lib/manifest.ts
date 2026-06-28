import {
  assertManifestReleaseId,
  parseDeployManifest,
  verifyAndParseImutableManifest,
  verifyManifestBytesWithSidecar,
  univocityManifestUrls,
  type DeployManifest,
  type ImutableBytecode,
} from "@univocity-tools/deploy-core";

export type VerifiedManifest = {
  manifest: DeployManifest;
  artifact: ImutableBytecode;
  releaseTag: string;
};

/** Fetch manifest + sidecar from GitHub release assets and verify. */
export async function fetchVerifiedManifest(
  releaseTag: string,
): Promise<VerifiedManifest> {
  const { manifestUrl, sidecarUrl } = univocityManifestUrls(releaseTag);
  const [manifestRes, sidecarRes] = await Promise.all([
    fetch(manifestUrl),
    fetch(sidecarUrl),
  ]);
  if (!manifestRes.ok) {
    throw new Error(
      `manifest fetch failed (${manifestRes.status}): ${manifestUrl}`,
    );
  }
  if (!sidecarRes.ok) {
    throw new Error(
      `sidecar fetch failed (${sidecarRes.status}): ${sidecarUrl}`,
    );
  }
  const raw = await manifestRes.text();
  const sidecar = await sidecarRes.text();
  const bytes = new TextEncoder().encode(raw);
  await verifyManifestBytesWithSidecar(bytes, sidecar);
  const { manifest, artifact } = await verifyAndParseImutableManifest(raw, {
    expectedReleaseId: releaseTag,
  });
  return { manifest, artifact, releaseTag };
}

/** Verify manifest + sidecar from local File objects (drag-drop). */
export async function verifyManifestFiles(
  manifestFile: File,
  sidecarFile: File,
  expectedReleaseId?: string,
): Promise<VerifiedManifest> {
  const [raw, sidecar] = await Promise.all([
    manifestFile.text(),
    sidecarFile.text(),
  ]);
  const bytes = new TextEncoder().encode(raw);
  await verifyManifestBytesWithSidecar(bytes, sidecar);
  const manifest = parseDeployManifest(raw);
  const releaseTag = expectedReleaseId ?? manifest.releaseId;
  if (expectedReleaseId !== undefined) {
    assertManifestReleaseId(manifest, expectedReleaseId);
  }
  const { manifest: verified, artifact } =
    await verifyAndParseImutableManifest(raw, {
      expectedReleaseId: releaseTag,
    });
  return { manifest: verified, artifact, releaseTag };
}
