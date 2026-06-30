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
        "Legacy CREATE3 proxy salt string (overrides counterfactual --log-id)",
      valueHint: "string",
    },
    "log-id": {
      type: "string",
      description:
        "Forest logId UUID for counterfactual salt (env: LOG_ID); mints if omitted",
      valueHint: "uuid",
    },
  }),
  run: defineCommandRunner(
    parseDeployUupsPredictOptions,
    runDeployUupsPredict,
  ),
});
