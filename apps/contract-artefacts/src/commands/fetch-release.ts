import {
  defineCartCommand,
  defineCommandRunner,
  fetchReleaseArgs,
} from "@univocity-tools/contract-artefacts-common";
import { runFetchRelease } from "@univocity-tools/contract-artefacts-common/main";
import { parseFetchReleaseOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "fetch-release",
    description:
      "Fetch contract build archives from a GitHub release (default: latest)",
  },
  args: fetchReleaseArgs,
  run: defineCommandRunner(parseFetchReleaseOptions, runFetchRelease),
});
