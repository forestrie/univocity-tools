import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runDeployImutableFromRelease } from "@univocity-tools/deployer-common/main";
import { parseDeployImutableFromReleaseOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "imutable",
    description:
      "One-shot EOA deploy of ImutableUnivocity from a Univocity GitHub release",
  },
  args: withDeployerArgs({
    "from-release": {
      type: "string",
      description:
        "Univocity release tag to fetch (deploy-manifest preferred, else " +
        "build archive; env: FROM_RELEASE)",
      valueHint: "tag",
    },
    "deployment-manifest-out": {
      type: "string",
      description:
        "Write the post-deploy deployment manifest JSON to this path",
      valueHint: "path",
    },
    "bootstrap-alg": {
      type: "string",
      description:
        "Bootstrap key algorithm: es256 or ks256 (env: BOOTSTRAP_ALG)",
      valueHint: "es256|ks256",
    },
    "bootstrap-es256-pem": {
      type: "string",
      description: "ES256 bootstrap key PEM (env: BOOTSTRAP_PEM_ES256)",
      valueHint: "pem",
    },
    "bootstrap-es256-x": {
      type: "string",
      description: "ES256 P-256 x coordinate (env: ES256_X)",
      valueHint: "hex",
    },
    "bootstrap-es256-y": {
      type: "string",
      description: "ES256 P-256 y coordinate (env: ES256_Y)",
      valueHint: "hex",
    },
    "bootstrap-ks256-signer": {
      type: "string",
      description: "KS256 bootstrap signer address (env: KS256_SIGNER)",
      valueHint: "address",
    },
    "chain-id": {
      type: "string",
      description: "Chain id override (env: CHAIN_ID)",
      valueHint: "number",
    },
    "rpc-url": {
      type: "string",
      description: "RPC URL for chain reads and broadcast (env: RPC_URL)",
      valueHint: "url",
    },
  }),
  run: defineCommandRunner(
    parseDeployImutableFromReleaseOptions,
    runDeployImutableFromRelease,
  ),
});
