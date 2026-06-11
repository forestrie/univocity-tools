import type { Out } from "@univocity-tools/cli-kit/reporting";
import { runChecked } from "@univocity-tools/subprocess/run-checked";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { ArchiveOptions } from "./options.js";

/** Foundry file cache that lets consumers materialize sources without forge. */
export const SOLIDITY_FILES_CACHE = "solidity-files-cache.json";

/**
 * Package the forge build outputs into a portable `tar.gz`.
 *
 * Assumes `forge build` already ran; copies the artifact `out/` tree and the
 * `solidity-files-cache.json` into `<workDir>/build`, then archives that
 * directory. Consumers can deploy, verify, and generate bindings from the
 * archive without the foundry toolchain. Sources are not shipped — they can
 * be materialized from `solidity-files-cache.json` and `out/build-info`.
 */
export async function runArchive(
  out: Out,
  options: ArchiveOptions,
): Promise<void> {
  const buildDir = path.join(options.workDir, "build");
  const buildOut = path.join(buildDir, "out");
  const buildCacheDir = path.join(buildDir, "cache");
  const cacheFile = path.join(options.cacheDir, SOLIDITY_FILES_CACHE);
  const archivePath = path.join(
    options.workDir,
    `${options.archiveName}.tar.gz`,
  );

  if (!existsSync(options.outDir)) {
    throw new Error(
      `forge out dir not found at ${options.outDir}; run forge build first`,
    );
  }
  if (!existsSync(cacheFile)) {
    throw new Error(
      `${SOLIDITY_FILES_CACHE} not found at ${cacheFile}; run forge build first`,
    );
  }

  out.print("archiving build outputs into %s", buildDir);

  await mkdir(buildDir, { recursive: true });
  await runChecked(out, [
    "rsync",
    "-a",
    "--delete",
    `${options.outDir}/`,
    `${buildOut}/`,
  ]);

  await mkdir(buildCacheDir, { recursive: true });
  await Bun.write(
    path.join(buildCacheDir, SOLIDITY_FILES_CACHE),
    Bun.file(cacheFile),
  );

  await runChecked(out, [
    "tar",
    "-czf",
    archivePath,
    "-C",
    options.workDir,
    "build",
  ]);

  out.print("created build archive %s", archivePath);
  out.out("%s", archivePath);
}
