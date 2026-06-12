import {
  defineCartCommand,
  defineCommandRunner,
} from "@univocity-tools/contract-artefacts-common";
import { runReleaseId } from "@univocity-tools/contract-artefacts-common/main";
import { parseReleaseIdOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "release-id",
    description:
      "Derive the release id (version+YYMMDD-<short-commit>) from the " +
      "contracts checkout's git tags and HEAD",
  },
  args: {
    "next-major": {
      type: "boolean",
      description: "Increment the major version (resets minor and patch)",
    },
    "next-minor": {
      type: "boolean",
      description: "Increment the minor version (resets patch)",
    },
    "next-patch": {
      type: "boolean",
      description: "Increment the patch version",
    },
    next: {
      type: "boolean",
      description: "Alias for --next-minor",
    },
    semver: {
      type: "boolean",
      description: "Print only the semver version (omit the build id)",
    },
  },
  run: defineCommandRunner(parseReleaseIdOptions, runReleaseId),
});
