import type { ConfigShowOptions } from "./options.js";
import { runDeployCreate3 } from "./deploy-create3.js";

export { runDeployCreate3 } from "./deploy-create3.js";

/** Print the resolved Create3 config as JSON. */
export async function runConfigShow(
  options: ConfigShowOptions,
): Promise<void> {
  if (options.verbose) {
    console.error(
      "config show:",
      "univocity-root:",
      options.univocityRoot,
      "forge-config:",
      options.forgeConfig,
    );
  }

  console.log(JSON.stringify(options.create3, null, 2));
}
