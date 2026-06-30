import {
  defineCartCommand,
  defineCommandRunner,
} from "@univocity-tools/contract-artefacts-common";
import { runListReleases } from "@univocity-tools/contract-artefacts-common/main";
import { parseListReleasesOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "list-releases",
    description:
      "List published Univocity contract releases and bootstrap addresses",
  },
  run: defineCommandRunner(parseListReleasesOptions, runListReleases),
});
