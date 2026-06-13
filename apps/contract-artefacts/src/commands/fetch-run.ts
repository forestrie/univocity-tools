import {
  defineCartCommand,
  defineCommandRunner,
  fetchRunArgs,
} from "@univocity-tools/contract-artefacts-common";
import { runFetchRun } from "@univocity-tools/contract-artefacts-common/main";
import { parseFetchRunOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: {
    name: "fetch-run",
    description:
      "Fetch contract build archives from a GitHub workflow run " +
      "(default: latest successful run of --workflow)",
  },
  args: fetchRunArgs,
  run: defineCommandRunner(parseFetchRunOptions, runFetchRun),
});
