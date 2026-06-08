import { mergeCommandArgs } from "@univocity-tools/cli-kit";
import type { ArgsDef } from "citty";

/** Citty flags for commands that need Create3 infra addresses. */
export const create3Args = {
  "create3-config": {
    type: "string",
    description:
      "Path to create3.jsonc. Omit to use embedded stable defaults " +
      "(or repo create3.jsonc when developing in a univocity-tools checkout).",
    valueHint: "path",
  },
} as const satisfies ArgsDef;

/** Merge Create3 flags into a command-specific `args` object. */
export function withCreate3Args<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(create3Args, args) as ArgsDef & T;
}
