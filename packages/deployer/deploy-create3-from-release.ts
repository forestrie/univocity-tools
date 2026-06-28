import type { Out } from "@univocity-tools/cli-kit/reporting";
import { resolveReleaseInputs } from "./deploy-imutable-from-release.js";
import { runDeployCreate3 } from "./deploy-create3.js";
import type { DeployCreate3FromReleaseOptions } from "./options.js";

export type DeployCreate3FromReleaseDeps = {
  resolveRelease?: typeof resolveReleaseInputs;
  deployCreate3?: typeof runDeployCreate3;
};

/** Fetch release assets and deploy CREATE3 factory without forge. */
export async function runDeployCreate3FromRelease(
  out: Out,
  options: DeployCreate3FromReleaseOptions,
  deps?: DeployCreate3FromReleaseDeps,
): Promise<void> {
  const resolveRelease = deps?.resolveRelease ?? resolveReleaseInputs;
  const deployCreate3 = deps?.deployCreate3 ?? runDeployCreate3;

  const resolved = await resolveRelease(out, options.fromRelease, options);

  const { fromRelease: _tag, ...deployOptions } = options;

  if (resolved.fromManifest !== undefined) {
    deployOptions.fromManifest = resolved.fromManifest;
    deployOptions.expectedReleaseId = options.fromRelease;
  } else if (resolved.releaseRoot !== undefined) {
    deployOptions.releaseRoot = resolved.releaseRoot;
  }

  await deployCreate3(out, deployOptions);
}
