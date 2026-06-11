import {
  defineCartCommand,
  defineCommandRunner,
} from "@univocity-tools/contract-artefacts-common";
import { runArchive } from "@univocity-tools/contract-artefacts-common/main";
import { parseArchiveOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "archive",
    description:
      "Package forge build outputs (out/ + solidity-files-cache.json) " +
      "into a tar.gz consumable without the foundry toolchain",
  },
  args: {
    "archive-name": {
      type: "string",
      description: "Base file name for the archive (default: build)",
      valueHint: "name",
      default: "build",
    },
  },
  run: defineCommandRunner(parseArchiveOptions, runArchive),
});
