import type { Out } from "@univocity-tools/cli-kit/reporting";
import { listContractReleases } from "@univocity-tools/deploy-core/list-releases";
import type { ListReleasesOptions } from "./options.js";

/** Print contract releases as JSON on stdout. */
export async function runListReleases(
  out: Out,
  options: ListReleasesOptions,
): Promise<void> {
  const releases = await listContractReleases({
    univocityRoot: options.univocityRoot,
  });
  out.out("%s", JSON.stringify(releases));
}
