import {
  defineCommandRunner,
  defineDeployerCommand,
} from "@univocity-tools/deployer-common";
import { runConfigShow } from "@univocity-tools/deployer-common/main";
import { parseConfigShowOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "show",
    description: "Print resolved Create3 config as JSON",
  },
  run: defineCommandRunner(parseConfigShowOptions, runConfigShow),
});
