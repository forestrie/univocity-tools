import type { Out } from "@univocity-tools/cli-kit/reporting";
import type { ValidateBatchOptions } from "./options.js";

/**
 * Validate a Safe batch JSON file.
 *
 * Callable from other packages/tests with a typed `ValidateBatchOptions`
 * — no citty or argv parsing here.
 */
export async function runValidateBatch(
  out: Out,
  options: ValidateBatchOptions,
): Promise<void> {
  out.log(
    "validate batch: %s univocity-root: %s forge-config: %s",
    options.path,
    options.univocityRoot,
    options.forgeConfig,
  );
  // Implementation: read file, run validators, Bun.spawn as needed.
  void options;
}
