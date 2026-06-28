import {
  defineDeployerCommand,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import {
  runDeployCreate3,
  runDeployCreate3FromRelease,
} from "@univocity-tools/deployer-common/main";
import {
  parseDeployCreate3FromReleaseOptions,
  parseDeployCreate3Options,
} from "@univocity-tools/deployer-common/options";
import type { LooseParsedArgs } from "@univocity-tools/cli-kit";
import {
  createOut,
  resolveVerbosity,
} from "@univocity-tools/cli-kit/reporting";

export default defineDeployerCommand({
  meta: {
    name: "create3",
    description:
      "Deploy the shared CREATE3 factory via Arachnid if not already deployed",
  },
  args: withDeployerArgs({
    "from-release": {
      type: "string",
      description:
        "Univocity release tag to fetch (deploy-manifest preferred; env: FROM_RELEASE)",
      valueHint: "tag",
    },
    "create3-salt": {
      type: "string",
      description:
        "CREATE3 factory salt string (default: forestrie.eth/univocity/CREATE3Factory/0 or CREATE3_SALT env)",
      valueHint: "string",
    },
    "release-root": {
      type: "string",
      description:
        "Extracted create3-factory release root (reads prebuilt bytecode; " +
        "env: RELEASE_ROOT)",
      valueHint: "path",
      default: "${env:RELEASE_ROOT}",
    },
    "from-manifest": {
      type: "string",
      description:
        "Deploy manifest with CREATE3Factory bytecode (env: DEPLOY_MANIFEST)",
      valueHint: "path|url",
      default: "${env:DEPLOY_MANIFEST}",
    },
    "manifest-sidecar": {
      type: "string",
      description:
        "Local sha256 sidecar for --from-manifest (env: DEPLOY_MANIFEST_SIDECAR)",
      valueHint: "path",
    },
    "force-factory-deploy": {
      type: "boolean",
      description:
        "Allow CREATE3 deploy when computed factory address differs from config",
      default: false,
    },
    insecure: {
      type: "boolean",
      description:
        "Allow http:// manifest URLs and skip deploy-manifest sidecar " +
        "verification on --from-release (local dev only)",
      default: false,
    },
  }),
  run: async ({ args, rawArgs }) => {
    const loose = args as LooseParsedArgs;
    const out = createOut(resolveVerbosity(loose, rawArgs));
    const fromRelease = loose["from-release"] ?? loose.fromRelease;
    if (fromRelease !== undefined && String(fromRelease).trim().length > 0) {
      await runDeployCreate3FromRelease(
        out,
        parseDeployCreate3FromReleaseOptions(loose),
      );
      return;
    }
    await runDeployCreate3(out, parseDeployCreate3Options(loose));
  },
});
