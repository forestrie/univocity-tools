import {
  defineCartCommand,
  defineCommandRunner,
} from "@univocity-tools/contract-artefacts-common";
import { runArchiveExtract } from "@univocity-tools/contract-artefacts-common/main";
import { parseArchiveExtractOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "archive-extract",
    description:
      "Extract a build archive into a release root and hydrate Solidity " +
      "sources from out/build-info",
  },
  args: {
    archive: {
      type: "positional",
      description: "Archive file to extract (relative to --work-dir)",
      required: true,
    },
    "release-root": {
      type: "string",
      description:
        "Directory to extract into and hydrate sources " +
        "(default: RELEASE_ROOT or cwd)",
      valueHint: "path",
      default: "${env:RELEASE_ROOT}",
    },
  },
  run: defineCommandRunner(parseArchiveExtractOptions, runArchiveExtract),
});
