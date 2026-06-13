import path from "node:path";
import { readEvaluatedStringOption } from "./evaluate-option-value.js";

export type ReleaseRootArgSlice = {
  releaseRoot?: string | undefined;
  "release-root"?: string | undefined;
};

/** Resolve --release-root (env RELEASE_ROOT) to an absolute path, or undefined. */
export function resolveReleaseRoot(
  args: Record<string, unknown>,
): string | undefined {
  const raw = readEvaluatedStringOption(args, "release-root");
  return raw === undefined ? undefined : path.resolve(raw);
}
