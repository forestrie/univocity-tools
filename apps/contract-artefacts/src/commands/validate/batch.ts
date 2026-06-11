import {
  defineCartCommand,
  defineCommandRunner,
} from "@univocity-tools/contract-artefacts-common";
import { runValidateBatch } from "@univocity-tools/contract-artefacts-common/main";
import { parseValidateBatchOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "batch",
    description: "Validate a Safe batch JSON file",
  },
  args: {
    path: {
      type: "positional",
      description: "Path to Safe batch JSON",
      required: true,
    },
  },
  run: defineCommandRunner(parseValidateBatchOptions, runValidateBatch),
});
