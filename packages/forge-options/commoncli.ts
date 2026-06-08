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
  "foundry-out": {
    type: "string",
    description:
      "Forge artifact output directory (relative to the forge config directory)",
    valueHint: "path",
    default: "out",
  },
} as const satisfies ArgsDef;

/** Merge forge flags into a command-specific `args` object. */
export function withForgeArgs<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(forgeArgs, args) as ArgsDef & T;
}
