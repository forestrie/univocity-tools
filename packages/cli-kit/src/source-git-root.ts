import path from "node:path";
import { evaluateOptionValue } from "./evaluate-option-value.js";
import { findGitRepoRootNamed } from "./find-git-repo-root.js";

export type SourceGitRootArgSlice = {
  sourceRoot?: string | undefined;
  "source-root"?: string | undefined;
};

export type ResolveSourceGitRootOptions = {
  /** When set, walk upward for a `.git` directory with this folder name. */
  gitRepoName?: string | undefined;
};

/**
 * Eagerly resolve the source git root to an absolute path.
 *
 * Order: explicit `--source-root` / `SOURCE_ROOT` → optional git discovery
 * (when `gitRepoName` is set) → cwd.
 */
export function resolveSourceGitRootEager(
  args: SourceGitRootArgSlice,
  options?: ResolveSourceGitRootOptions,
): string {
  const raw =
    evaluateOptionValue(
      "source-root",
      args.sourceRoot ?? args["source-root"],
    ) ?? process.env.SOURCE_ROOT;

  if (raw) {
    return path.resolve(process.cwd(), raw);
  }

  const gitRepoName = options?.gitRepoName;
  if (gitRepoName !== undefined) {
    const discovered = findGitRepoRootNamed(gitRepoName, process.cwd());
    if (discovered) {
      return discovered;
    }
  }

  return path.resolve(process.cwd());
}
