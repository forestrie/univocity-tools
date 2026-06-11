import { mergeCommandArgs } from "@univocity-tools/cli-kit";
import type { ArgsDef } from "citty";

/** Citty flags for commands that invoke forge. */
export const forgeArgs = {
  "forge-config": {
    type: "string",
    description:
      "For commands that use forge, this option specifies the location of foundry.toml",
    valueHint: "path",
    default: "foundry.toml",
  },
  "build-root": {
    type: "string",
    description:
      "Base directory for forge artifact dirs (defaults to the forge config directory)",
    valueHint: "path",
  },
  "foundry-out": {
    type: "string",
    description: "Forge artifact output directory (relative to --build-root)",
    valueHint: "path",
    default: "out",
  },
  "foundry-src": {
    type: "string",
    description: "Forge sources directory (relative to --build-root)",
    valueHint: "path",
    default: "src",
  },
  "foundry-cache": {
    type: "string",
    description: "Forge cache directory (relative to --build-root)",
    valueHint: "path",
    default: "cache",
  },
  "foundry-libs": {
    type: "string",
    description: "Forge libraries directory (relative to --build-root)",
    valueHint: "path",
    default: "lib",
  },
} as const satisfies ArgsDef;

/** Merge forge flags into a command-specific `args` object. */
export function withForgeArgs<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(forgeArgs, args) as ArgsDef & T;
}
