import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runProposeImutable } from "@univocity-tools/deployer-common/main";
import { parseProposeImutableOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "imutable",
    description:
      "Build a deploy-imutable proposal (EOA contract-create or Safe " +
      "CreateCall); optionally publish to the Safe Transaction Service",
  },
  args: withDeployerArgs({
    "bootstrap-alg": {
      type: "string",
      description:
        "Bootstrap key algorithm: es256 or ks256 (env: BOOTSTRAP_ALG)",
      valueHint: "es256|ks256",
    },
    "bootstrap-es256-pem": {
      type: "string",
      description:
        "ES256 bootstrap key as inline PEM (env: BOOTSTRAP_PEM_ES256). " +
        "SEC1 EC PRIVATE KEY and PKCS#8 are supported; falls back to " +
        "--bootstrap-es256-pub when PEM parsing fails",
      valueHint: "pem",
    },
    "bootstrap-es256-pub": {
      type: "string",
      description:
        "ES256 bootstrap public key as 64-byte hex x||y (env: BOOTSTRAP_PUB_ES256)",
      valueHint: "hex",
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
    "bootstrap-es256-generate": {
      type: "boolean",
      description:
        "Generate an ephemeral P-256 ES256 bootstrap keypair (requires " +
        "--bootstrap-es256-pem-out)",
      default: false,
    },
    "bootstrap-es256-pem-out": {
      type: "string",
      description:
        "Write generated ES256 bootstrap PKCS#8 PEM to this path " +
        "(with --bootstrap-es256-generate)",
      valueHint: "path",
    },
    "bootstrap-ks256-signer": {
      type: "string",
      description:
        "KS256 bootstrap signer address; defaults to the Safe when " +
        "--safe-publish (env: KS256_SIGNER)",
      valueHint: "address",
    },
    "bootstrap-ks256-generate": {
      type: "boolean",
      description:
        "Generate an ephemeral secp256k1 KS256 bootstrap EOA (requires " +
        "--bootstrap-ks256-key-out)",
      default: false,
    },
    "bootstrap-ks256-key-out": {
      type: "string",
      description:
        "Write generated KS256 bootstrap private key hex to this path " +
        "(with --bootstrap-ks256-generate)",
      valueHint: "path",
    },
    "safe-publish": {
      type: "boolean",
      description:
        "Sign and POST the proposal to the Safe Transaction Service",
      default: false,
    },
    "create-call-address": {
      type: "string",
      description:
        "Gnosis CreateCall library address (env: CREATE_CALL_ADDRESS)",
      valueHint: "address",
    },
    salt: {
      type: "string",
      description:
        "CREATE2 salt (bytes32); defaults to keccak256 of a per-Safe label " +
        "(env: SAFE_BATCH_SALT)",
      valueHint: "hex",
    },
    "chain-id": {
      type: "string",
      description:
        "Chain id for the proposal; defaults to cast chain-id (env: CHAIN_ID)",
      valueHint: "number",
    },
    "safe-tx-service-url": {
      type: "string",
      description:
        "Safe Transaction Service base URL (env: SAFE_TX_SERVICE_URL)",
      valueHint: "url",
    },
    out: {
      type: "string",
      description: "Write the proposal JSON to this path (default: stdout)",
      valueHint: "path",
    },
    "release-root": {
      type: "string",
      description:
        "Extracted build archive root (from archive-extract; reads " +
        "<release-root>/out/ImutableUnivocity.json instead of forge build; " +
        "env: RELEASE_ROOT)",
      valueHint: "path",
      default: "${env:RELEASE_ROOT}",
    },
    "from-manifest": {
      type: "string",
      description:
        "Deploy manifest JSON file or URL (reads ImutableUnivocity " +
        "creationBytecode with sha256 verification; env: DEPLOY_MANIFEST)",
      valueHint: "path|url",
      default: "${env:DEPLOY_MANIFEST}",
    },
  }),
  run: defineCommandRunner(parseProposeImutableOptions, runProposeImutable),
});
