import {
  defineCartCommand,
  defineCommandRunner,
} from "@univocity-tools/contract-artefacts-common";
import { runArchiveValidate } from "@univocity-tools/contract-artefacts-common/main";
import { parseArchiveValidateOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "archive-validate",
    description:
      "Validate a release root (after archive-extract) against the forge " +
      "build tree in the contracts checkout",
  },
  args: {
    "release-root": {
      type: "string",
      description: "Release root to validate (default: RELEASE_ROOT or cwd)",
      valueHint: "path",
      default: "${env:RELEASE_ROOT}",
    },
  },
  run: defineCommandRunner(parseArchiveValidateOptions, runArchiveValidate),
});
