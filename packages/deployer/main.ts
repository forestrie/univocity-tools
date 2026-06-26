import type { Out } from "@univocity-tools/cli-kit/reporting";
import type { ConfigShowOptions } from "./options.js";
import { runDeployCreate3 } from "./deploy-create3.js";

export { runDeployCreate3 } from "./deploy-create3.js";
export { runProposeImutable } from "./propose-imutable.js";
export { runExecuteProposal } from "./execute-proposal.js";
export { runApproveProposal } from "./approve-proposal.js";
export { runDeployImutableFromRelease } from "./deploy-imutable-from-release.js";

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
