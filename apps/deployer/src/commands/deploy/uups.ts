import {
  defineDeployerCommand,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import {
  runDeployUups,
  runDeployUupsFromRelease,
} from "@univocity-tools/deployer-common/main";
import {
  parseDeployUupsFromReleaseOptions,
  parseDeployUupsOptions,
} from "@univocity-tools/deployer-common/options";
import type { LooseParsedArgs } from "@univocity-tools/cli-kit";
import { createOut, resolveVerbosity } from "@univocity-tools/cli-kit/reporting";

export default defineDeployerCommand({
  meta: {
    name: "uups",
    description: "Deploy UUPSUnivocity proxy via CREATE3 (foundry-free)",
  },
  args: withDeployerArgs({
    "from-release": {
      type: "string",
      description:
        "Univocity release tag to fetch (deploy-manifest preferred; env: FROM_RELEASE)",
      valueHint: "tag",
    },
    "proxy-salt": {
      type: "string",
      description:
        "CREATE3 proxy salt string (default: forestrie.eth/univocity/UUPSUnivocity/0)",
      valueHint: "string",
    },
    "upgrade-admin": {
      type: "string",
      description: "UUPS upgrade admin address (env: UPGRADE_ADMIN)",
      valueHint: "address",
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
    "release-root": {
      type: "string",
      description: "Extracted univocity release root (env: RELEASE_ROOT)",
      valueHint: "path",
      default: "${env:RELEASE_ROOT}",
    },
    "from-manifest": {
      type: "string",
      description: "Deploy manifest with UUPS bytecode (env: DEPLOY_MANIFEST)",
      valueHint: "path|url",
      default: "${env:DEPLOY_MANIFEST}",
    },
    "manifest-sidecar": {
      type: "string",
      description:
        "Local sha256 sidecar for --from-manifest (env: DEPLOY_MANIFEST_SIDECAR)",
      valueHint: "path",
    },
    "deployment-manifest-out": {
      type: "string",
      description: "Write post-deploy uups-deployment manifest JSON here",
      valueHint: "path",
    },
    "rpc-url": {
      type: "string",
      description: "RPC URL for chain reads and broadcast (env: RPC_URL)",
      valueHint: "url",
    },
    insecure: {
      type: "boolean",
      description:
        "Allow http:// manifest URLs and skip deploy-manifest sidecar " +
        "verification on --from-release (local dev only)",
      default: false,
    },
  }),
  subCommands: {
    predict: () => import("./uups/predict.js").then((m) => m.default),
  },
  run: async ({ args, rawArgs }) => {
    const loose = args as LooseParsedArgs;
    const out = createOut(resolveVerbosity(loose, rawArgs));
    const fromRelease = loose["from-release"] ?? loose.fromRelease;
    if (fromRelease !== undefined && String(fromRelease).trim().length > 0) {
      await runDeployUupsFromRelease(
        out,
        parseDeployUupsFromReleaseOptions(loose),
      );
      return;
    }
    const manifest = await runDeployUups(out, parseDeployUupsOptions(loose));
    out.out("%s", JSON.stringify(manifest, null, 2));
  },
});
