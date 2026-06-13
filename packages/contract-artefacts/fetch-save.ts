import type { Out } from "@univocity-tools/cli-kit/reporting";
import fs from "node:fs/promises";
import path from "node:path";
import { deriveArtefactBaseName } from "./artefact-name.js";

/** Absolute destination path for an artefact under workDir. */
export function resolveArtefactDest(
  workDir: string,
  fileName: string,
): string {
  const baseName = deriveArtefactBaseName(fileName);
  return path.join(workDir, baseName, fileName);
}

/** Move or copy a downloaded artefact into workDir/<base>/<fileName>. */
export async function saveArtefact(
  out: Out,
  workDir: string,
  fileName: string,
  sourcePath: string,
): Promise<string> {
  const destPath = resolveArtefactDest(workDir, fileName);
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.rename(sourcePath, destPath).catch(async () => {
    await fs.copyFile(sourcePath, destPath);
    await fs.unlink(sourcePath);
  });
  out.out("%s", destPath);
  return destPath;
}
