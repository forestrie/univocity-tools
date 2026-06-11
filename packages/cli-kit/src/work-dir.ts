import path from "node:path";
import { evaluateOptionValue } from "./evaluate-option-value.js";

export const DEFAULT_WORK_DIR = ".work";

export type WorkDirArgSlice = {
  workDir?: string | undefined;
  "work-dir"?: string | undefined;
};

/**
 * Resolve the work dir to an absolute path, relative to the source root.
 * Defaults to `.work` when the flag/env is unset.
 */
export function resolveWorkDir(
  args: WorkDirArgSlice,
  sourceRoot: string,
): string {
  const raw = evaluateOptionValue(
    "work-dir",
    args.workDir ?? args["work-dir"],
  );
  return path.resolve(sourceRoot, raw ?? DEFAULT_WORK_DIR);
}
