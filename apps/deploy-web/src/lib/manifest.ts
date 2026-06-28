import {
  assertManifestReleaseId,
  normalizeUnivocityReleaseTag,
  parseDeployManifest,
  verifyAndParseImutableManifest,
  verifyManifestBytesWithSidecar,
  type DeployManifest,
  type ImutableBytecode,
} from "@univocity-tools/deploy-core";

export type VerifiedManifest = {
  manifest: DeployManifest;
  artifact: ImutableBytecode;
  releaseTag: string;
};

/** Fetch manifest + sidecar via same-origin API proxy and verify. */
export async function fetchVerifiedManifest(
  releaseTagInput: string,
): Promise<VerifiedManifest> {
  const releaseTag = normalizeUnivocityReleaseTag(releaseTagInput);
  const response = await fetch(
    `/api/manifest/${encodeURIComponent(releaseTag)}`,
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      body.error ?? `manifest fetch failed (${response.status})`,
    );
  }
  const payload = (await response.json()) as {
    raw: string;
    sidecar: string;
    releaseTag: string;
  };
  const bytes = new TextEncoder().encode(payload.raw);
  await verifyManifestBytesWithSidecar(bytes, payload.sidecar);
  const { manifest, artifact } = await verifyAndParseImutableManifest(
    payload.raw,
    {
      expectedReleaseId: payload.releaseTag,
    },
  );
  return { manifest, artifact, releaseTag: payload.releaseTag };
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
