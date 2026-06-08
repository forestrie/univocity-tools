import {
  evaluateOptionValue,
  findGitRepoRootNamed,
} from "@univocity-tools/cli-kit";
import path from "node:path";

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
    evaluateOptionValue(
      "univocity-root",
      args.univocityRoot ?? args["univocity-root"],
    ) ?? process.env.UNIVOCITY_ROOT;

  if (raw) {
    return path.resolve(process.cwd(), raw);
  }

  const discovered = findGitRepoRootNamed("univocity", process.cwd());
  if (discovered) {
    return discovered;
  }

  return path.resolve(process.cwd());
}
