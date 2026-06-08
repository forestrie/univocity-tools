import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Walk upward from `startDir` for a git worktree whose directory name
 * matches `name`. Returns the absolute repo root, or undefined if not found.
 */
export function findGitRepoRootNamed(
  name: string,
  startDir: string,
): string | undefined {
  let dir = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(dir, ".git"))) {
      return path.basename(dir) === name ? path.resolve(dir) : undefined;
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}
