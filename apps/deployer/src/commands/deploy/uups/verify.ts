import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runDeployUupsVerify } from "@univocity-tools/deployer-common/main";
import { parseDeployUupsVerifyOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "verify",
    description:
      "Verify a counterfactual UUPS deployment (address, upgradeAdmin, impl)",
  },
  args: withDeployerArgs({
    "deployment-manifest": {
      type: "string",
      description: "Post-deploy uups-deployment manifest JSON path",
      valueHint: "path",
    },
    "from-manifest": {
      type: "string",
      description:
        "Release deploy manifest for implementation bytecode check (env: DEPLOY_MANIFEST)",
      valueHint: "path|url",
      default: "${env:DEPLOY_MANIFEST}",
    },
    "manifest-sidecar": {
      type: "string",
      description:
        "Local sha256 sidecar for --from-manifest (env: DEPLOY_MANIFEST_SIDECAR)",
      valueHint: "path",
    },
    "rpc-url": {
      type: "string",
      description: "RPC URL for chain reads (env: RPC_URL)",
      valueHint: "url",
    },
    insecure: {
      type: "boolean",
      description: "Allow http:// manifest URLs (local dev only)",
      default: false,
    },
  }),
  run: defineCommandRunner(
    parseDeployUupsVerifyOptions,
    async (out, options) => {
      await runDeployUupsVerify(out, options);
    },
  ),
});
