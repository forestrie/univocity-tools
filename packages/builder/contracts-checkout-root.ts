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

export type ContractsCheckoutRootArgSlice = {
  univocityRoot?: string | undefined;
  "univocity-root"?: string | undefined;
};

/**
 * Eagerly resolve the contracts checkout root to an absolute path.
 *
 * Order: explicit flag/env → git discovery (basename `univocity`) → cwd.
 */
export function resolveContractsCheckoutRootEager(
  args: ContractsCheckoutRootArgSlice,
): string {
  const raw =
    args.univocityRoot ?? args["univocity-root"] ?? process.env.UNIVOCITY_ROOT;

  if (raw) {
    return path.resolve(process.cwd(), raw);
  }

  const discovered = findGitRepoRootNamed("univocity", process.cwd());
  if (discovered) {
    return discovered;
  }

  return path.resolve(process.cwd());
}
