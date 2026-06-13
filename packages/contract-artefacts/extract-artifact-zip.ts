import type { Out } from "@univocity-tools/cli-kit/reporting";
import { runChecked } from "@univocity-tools/subprocess/run-checked";
import fs from "node:fs/promises";
import path from "node:path";

/** Extract a workflow artefact zip and return tarball paths inside. */
export async function extractArtifactZip(
  out: Out,
  zipPath: string,
  extractDir: string,
): Promise<string[]> {
  await fs.mkdir(extractDir, { recursive: true });
  await runChecked(out, ["unzip", "-o", zipPath, "-d", extractDir]);
  return collectTarballs(extractDir);
}

async function collectTarballs(rootDir: string): Promise<string[]> {
  const tarballs: string[] = [];
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      tarballs.push(...(await collectTarballs(entryPath)));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".tar.gz")) {
      continue;
    }
    tarballs.push(entryPath);
  }
  return tarballs;
}
