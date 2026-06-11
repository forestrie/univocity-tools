import type { ArgsDef } from "citty";
import {
  resolveSourceGitRootEager,
  type ResolveSourceGitRootOptions,
  type SourceGitRootArgSlice,
} from "./source-git-root.js";
import { resolveWorkDir, type WorkDirArgSlice } from "./work-dir.js";

/** Flags shared by every univocity-tools command (after parsing). */
export type CommonOptions = {
  /** Source checkout root — always an absolute path after parsing. */
  sourceRoot: string;
  /** Work dir for build/deploy artifacts — absolute, under `sourceRoot`. */
  workDir: string;
};

export type CommonOptionsArgSlice = SourceGitRootArgSlice & WorkDirArgSlice;

export type ParseCommonOptionsConfig = ResolveSourceGitRootOptions;

/**
 * Citty flags common to every univocity-tools CLI command.
 *
 * Spread into each app's `commonArgs`; citty does not inherit parent flags
 * into child `args`.
 */
export const commonOptionArgs = {
  "source-root": {
    type: "string",
    description:
      "Path to the source repo checkout (overrides SOURCE_ROOT; " +
      "otherwise app-specific git discovery, else cwd)",
    valueHint: "path",
  },
  "work-dir": {
    type: "string",
    description:
      "Work dir for build/deploy artifacts (relative to --source-root)",
    valueHint: "path",
    default: ".work",
  },
} as const satisfies ArgsDef;

/** Resolve the common options (source root, work dir) at parse time. */
export function parseCommonOptions(
  args: CommonOptionsArgSlice,
  config?: ParseCommonOptionsConfig,
): CommonOptions {
  const sourceRoot = resolveSourceGitRootEager(args, config);
  return {
    sourceRoot,
    workDir: resolveWorkDir(args, sourceRoot),
  };
}
