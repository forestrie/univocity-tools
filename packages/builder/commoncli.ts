import { defineAppCommand, mergeCommandArgs } from "@univocity-tools/cli-kit";
export { defineCommandRunner } from "@univocity-tools/cli-kit";
import { verbosityArgs } from "@univocity-tools/cli-kit/reporting";
import { foundryBinArgs } from "@univocity-tools/foundry-exec/commoncli";
import { forgeArgs } from "@univocity-tools/forge-options/commoncli";
import type { ArgsDef, CommandDef } from "citty";

const builderOnlyArgs = {
  "univocity-root": {
    type: "string",
    description:
      "Path to the contracts repo checkout (overrides UNIVOCITY_ROOT; " +
      "otherwise discovered from a git repo named univocity, else cwd)",
    valueHint: "path",
  },
} as const satisfies ArgsDef;

/**
 * Flags shared by every builder command and subcommand.
 *
 * Options only — no positional args. citty does not inherit parent flags
 * into child `args`; merge these on each command via `defineBuilderCommand`
 * or `withBuilderArgs`.
 */
export const commonArgs = {
  ...verbosityArgs,
  ...builderOnlyArgs,
  ...forgeArgs,
  ...foundryBinArgs,
} as const satisfies ArgsDef;

export type BuilderCommonArgs = {
  verbosity?: string;
  univocityRoot?: string;
  forgeConfig?: string;
  foundryOut?: string;
};

/** Merge builder-wide flags into a command-specific `args` object. */
export function withBuilderArgs<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(commonArgs, args) as ArgsDef & T;
}

/** `defineCommand` with builder-wide flags merged into `args`. */
export function defineBuilderCommand<T extends ArgsDef>(
  def: CommandDef<T>,
): CommandDef<T> {
  return defineAppCommand(commonArgs, def);
}
