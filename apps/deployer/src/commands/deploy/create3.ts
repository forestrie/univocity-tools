import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runDeployCreate3 } from "@univocity-tools/deployer-common/main";
import { parseDeployCreate3Options } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "create3",
    description:
      "Deploy the shared CREATE3 factory via Arachnid if not already deployed",
  },
  args: withDeployerArgs({
    "rpc-url": {
      type: "string",
      description: "RPC endpoint (default: RPC_URL env)",
      valueHint: "url",
    },
    "private-key": {
      type: "string",
      description:
        "Deployer private key (default: PRIVATE_KEY or DEPLOY_KEY env)",
      valueHint: "hex",
    },
    "create3-salt": {
      type: "string",
      description:
        "CREATE3 factory salt string (default: univocity-create3/1 or CREATE3_SALT env)",
      valueHint: "string",
    },
  }),
  run: defineCommandRunner(parseDeployCreate3Options, runDeployCreate3),
});
