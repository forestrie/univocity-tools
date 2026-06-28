import type { Out } from "@univocity-tools/cli-kit/reporting";
import { resolveReleaseInputs } from "./deploy-imutable-from-release.js";
import { runDeployUups, type UupsDeploymentManifest } from "./deploy-uups.js";
import type { DeployUupsFromReleaseOptions } from "./options.js";

export type DeployUupsFromReleaseDeps = {
  resolveRelease?: typeof resolveReleaseInputs;
  deployUups?: typeof runDeployUups;
};

/** Fetch release assets and deploy UUPSUnivocity proxy without forge. */
export async function runDeployUupsFromRelease(
  out: Out,
  options: DeployUupsFromReleaseOptions,
  deps?: DeployUupsFromReleaseDeps,
): Promise<UupsDeploymentManifest> {
  const resolveRelease = deps?.resolveRelease ?? resolveReleaseInputs;
  const deployUups = deps?.deployUups ?? runDeployUups;

  const resolved = await resolveRelease(
    out,
    options.fromRelease,
    options,
  );

  const { fromRelease: _tag, ...deployOptions } = options;

  if (resolved.fromManifest !== undefined) {
    deployOptions.fromManifest = resolved.fromManifest;
    deployOptions.expectedReleaseId = options.fromRelease;
  } else if (resolved.releaseRoot !== undefined) {
    deployOptions.releaseRoot = resolved.releaseRoot;
  }

  const manifest = await deployUups(out, deployOptions);
  const manifestPath =
    options.deploymentManifestOut ??
    `${options.workDir}/uups-manifest-${options.fromRelease}.json`;
  await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  out.out("Deployment manifest: %s", manifestPath);
  return manifest;
}
