import { mergeCommandArgs } from "@univocity-tools/cli-kit";
import { DEFAULT_CAST_BIN, DEFAULT_FORGE_BIN } from "./resolve-bin.js";
import type { ArgsDef } from "citty";

/** Citty flags for forge/cast binary paths. */
export const foundryBinArgs = {
  "forge-bin": {
    type: "string",
    description:
      "Path to the forge binary (PATH lookup first, then cwd-relative)",
    valueHint: "path",
    default: DEFAULT_FORGE_BIN,
  },
  "cast-bin": {
    type: "string",
    description:
      "Path to the cast binary (PATH lookup first, then cwd-relative)",
    valueHint: "path",
    default: DEFAULT_CAST_BIN,
  },
} as const satisfies ArgsDef;

/** Merge forge/cast bin flags into a command-specific `args` object. */
export function withFoundryBinArgs<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(foundryBinArgs, args) as ArgsDef & T;
}
