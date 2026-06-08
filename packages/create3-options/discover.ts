import { existsSync } from "node:fs";
import path from "node:path";
import { findGitRepoRootNamed } from "@univocity-tools/cli-kit";

export const CREATE3_CONFIG_FILENAME = "create3.jsonc";

/** Discover the tools repo root from `cwd`, if any. */
export function findToolsRepoRoot(cwd: string): string | undefined {
  return findGitRepoRootNamed("univocity-tools", cwd);
}

/** Absolute path to repo-root create3.jsonc when developing in a checkout. */
export function discoverCreate3ConfigPath(cwd: string): string | undefined {
  const toolsRoot = findToolsRepoRoot(cwd);
  if (!toolsRoot) {
    return undefined;
  }

  const configPath = path.join(toolsRoot, CREATE3_CONFIG_FILENAME);
  return existsSync(configPath) ? configPath : undefined;
}
