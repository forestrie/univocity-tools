import type { Out } from "@univocity-tools/cli-kit/reporting";
import type { ConfigShowOptions } from "./options.js";
import { runDeployCreate3 } from "./deploy-create3.js";

export { runDeployCreate3 } from "./deploy-create3.js";
export { runDeployCreate3FromRelease } from "./deploy-create3-from-release.js";
export { runDeployUups } from "./deploy-uups.js";
export { runDeployUupsFromRelease } from "./deploy-uups-from-release.js";
export { runDeployUupsVerify } from "./deploy-uups-verify.js";
export { runDeployUupsPredict } from "./deploy-uups-predict.js";
export { runProposeImutable } from "./propose-imutable.js";
export { runExecuteProposal } from "./execute-proposal.js";
export { runApproveProposal } from "./approve-proposal.js";
export { runDeployImutableFromRelease } from "./deploy-imutable-from-release.js";
export { runProvisionImutableAlg } from "./provision-imutable-alg.js";
export { runProvisionImutableE2e } from "./provision-imutable-e2e.js";
export { genesisLogIdFromImutableAddress } from "./genesis-log-id.js";
export {
  readImutableDeploymentManifest,
  writeImutableDeploymentManifest,
} from "./imutable-deployment-manifest.js";
export {
  verifyImutableBootstrap,
  verifyImutableBootstrapPair,
} from "./verify-imutable-bootstrap.js";

/** Print the resolved Create3 config as JSON. */
export async function runConfigShow(
  out: Out,
  options: ConfigShowOptions,
): Promise<void> {
  out.log(
    "config show: univocity-root: %s forge-config: %s",
    options.univocityRoot,
    options.forgeConfig,
  );

  out.out("%s", JSON.stringify(options.create3, null, 2));
}
