import path from "node:path";
import { CREATE3_DEFAULTS } from "./src/defaults.js";
import type { Create3Config } from "./create3-config.js";
import { discoverCreate3ConfigPath } from "./discover.js";
import { parseJsoncFileSync } from "./load-jsonc.js";

export type Create3ArgSlice = {
  create3Config?: string | undefined;
  "create3-config"?: string | undefined;
};

/**
 * Resolve Create3 config synchronously at parse time.
 *
 * Order: --create3-config → CREATE3_CONFIG → discovered create3.jsonc →
 * embedded defaults.
 */
export function resolveCreate3Config(
  args: Create3ArgSlice,
  cwd: string = process.cwd(),
): Create3Config {
  const explicit =
    args.create3Config ?? args["create3-config"] ?? process.env.CREATE3_CONFIG;

  if (explicit) {
    return parseJsoncFileSync(path.resolve(cwd, explicit));
  }

  const discovered = discoverCreate3ConfigPath(cwd);
  if (discovered) {
    return parseJsoncFileSync(discovered);
  }

  return { ...CREATE3_DEFAULTS };
}

export function parseCreate3Options(args: Create3ArgSlice): Create3Config {
  return resolveCreate3Config(args);
}
