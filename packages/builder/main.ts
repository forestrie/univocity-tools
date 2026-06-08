import type { ValidateBatchOptions } from "./options.js";

/**
 * Validate a Safe batch JSON file.
 *
 * Callable from other packages/tests with a typed `ValidateBatchOptions`
 * — no citty or argv parsing here.
 */
export async function runValidateBatch(
  options: ValidateBatchOptions,
): Promise<void> {
  if (options.verbose) {
    console.error(
      "validate batch:",
      options.path,
      "univocity-root:",
      options.univocityRoot,
      "forge-config:",
      options.forgeConfig,
    );
  }
  // Implementation: read file, run validators, Bun.spawn as needed.
  void options;
}
