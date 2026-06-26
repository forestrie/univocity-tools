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
  }),
  run: defineCommandRunner(parseDeployCreate3Options, runDeployCreate3),
});
