import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runProvisionImutableE2e } from "@univocity-tools/deployer-common/main";
import { parseProvisionImutableE2eOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "e2e",
    description:
      "Ephemeral Univocity provision: fetch release archive, deploy es256 " +
      "and ks256 ImutableUnivocity via EOA, verify bootstrapConfig",
  },
  args: withDeployerArgs({
    alg: {
      type: "string",
      description:
        "Deploy a single bootstrap alg variant (default: es256 then ks256)",
      valueHint: "es256|ks256",
    },
    "run-id": {
      type: "string",
      description:
        "Provision run id for manifest pointers (env: E2E_PROVISION_RUN_ID)",
      valueHint: "id",
    },
    "proposal-dir": {
      type: "string",
      description: "Directory for proposals and deployment manifests",
      valueHint: "path",
    },
    "bootstrap-es256-pem-out": {
      type: "string",
      description: "Write generated ES256 bootstrap PEM to this path",
      valueHint: "path",
    },
    "bootstrap-ks256-key-out": {
      type: "string",
      description: "Write generated KS256 bootstrap private key to this path",
      valueHint: "path",
    },
    "skip-fetch": {
      type: "boolean",
      description:
        "Skip fetch-release and archive-extract (requires --release-root)",
      default: false,
    },
    "fetch-org": {
      type: "string",
      description: "GitHub org for fetch-release (default: forestrie)",
      valueHint: "org",
    },
    "fetch-repo": {
      type: "string",
      description: "GitHub repo for fetch-release (default: univocity)",
      valueHint: "repo",
    },
    "fetch-artefact": {
      type: "string",
      description: "Release artefact name (default: univocity)",
      valueHint: "name",
    },
    "fetch-auth-kind": {
      type: "string",
      description: "GitHub auth for fetch-release: gh-cli or env",
      valueHint: "gh-cli|env",
    },
    "release-root": {
      type: "string",
      description:
        "Extracted build archive root (skips fetch when set with --skip-fetch)",
      valueHint: "path",
      default: "${env:RELEASE_ROOT}",
    },
  }),
  run: defineCommandRunner(
    parseProvisionImutableE2eOptions,
    runProvisionImutableE2e,
  ),
});
