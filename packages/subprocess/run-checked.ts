import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  formatProcessFailure,
  runProcess,
  type RunProcessOptions,
  type RunProcessResult,
} from "./run-process.js";

/**
 * Run an external program, log stderr via `out`, and throw on non-zero exit.
 */
export async function runChecked(
  out: Out,
  argv: string[],
  options?: RunProcessOptions,
): Promise<RunProcessResult> {
  const result = await runProcess(argv, options);

  if (result.stderr.length > 0) {
    out.log("%s", result.stderr);
  }
  if (result.exitCode !== 0) {
    throw new Error(formatProcessFailure(argv.join(" "), result));
  }

  return result;
}
