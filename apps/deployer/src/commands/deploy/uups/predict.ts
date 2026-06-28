import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runDeployUupsPredict } from "@univocity-tools/deployer-common/main";
import { parseDeployUupsPredictOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "predict",
    description: "Print predicted UUPSUnivocity CREATE3 proxy address",
  },
  args: withDeployerArgs({
    "proxy-salt": {
      type: "string",
      description:
        "CREATE3 proxy salt string (default: forestrie.eth/univocity/UUPSUnivocity/0)",
      valueHint: "string",
    },
  }),
  run: defineCommandRunner(
    parseDeployUupsPredictOptions,
    runDeployUupsPredict,
  ),
});
