import fs from "node:fs";
import path from "node:path";

export const DEFAULT_FORGE_BIN = "forge";
export const DEFAULT_CAST_BIN = "cast";

function isExecutableFile(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve a forge/cast binary to an absolute executable path.
 *
 * Order: PATH via Bun.which, then path.resolve(cwd, name).
 * Returns false when no executable match exists.
 */
export function resolveExecutableBin(
  raw: string | undefined,
  defaultName: string,
  cwd: string = process.cwd(),
): string | false {
  const name = raw ?? defaultName;
  const fromPath = Bun.which(name);
  if (fromPath && isExecutableFile(fromPath)) {
    return path.resolve(fromPath);
  }

  const resolved = path.resolve(cwd, name);
  if (isExecutableFile(resolved)) {
    return resolved;
  }

  return false;
}
