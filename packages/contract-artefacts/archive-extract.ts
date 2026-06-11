import type { Out } from "@univocity-tools/cli-kit/reporting";
import { hydrateSources } from "@univocity-tools/foundry-artefacts";
import { runChecked } from "@univocity-tools/subprocess/run-checked";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { ArchiveExtractOptions } from "./options.js";

/**
 * Extract a build archive into a release root and hydrate Solidity sources
 * from `out/build-info` embedded content.
 */
export async function runArchiveExtract(
  out: Out,
  options: ArchiveExtractOptions,
): Promise<void> {
  if (!existsSync(options.archive)) {
    throw new Error(`build archive not found at ${options.archive}`);
  }

  out.print("extracting %s into %s", options.archive, options.releaseRoot);

  await mkdir(options.releaseRoot, { recursive: true });
  await runChecked(out, [
    "tar",
    "-xzf",
    options.archive,
    "-C",
    options.releaseRoot,
    "--strip-components=1",
  ]);

  const { written, warnings } = await hydrateSources(options.releaseRoot);
  for (const warning of warnings) {
    out.log("warning: %s", warning);
  }
  if (written > 0) {
    out.print(
      "materialized %d source file(s) from build-info into %s",
      written,
      options.releaseRoot,
    );
  }

  out.out("%s", options.releaseRoot);
}
