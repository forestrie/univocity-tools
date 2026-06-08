import {
  defineBuilderCommand,
  defineCommandRunner,
} from "@univocity-tools/builder-common";
import { runValidateBatch } from "@univocity-tools/builder-common/main";
import { parseValidateBatchOptions } from "@univocity-tools/builder-common/options";

export default defineBuilderCommand({
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
