import {
  commonOptionArgs,
  defineAppCommand,
  mergeCommandArgs,
} from "@univocity-tools/cli-kit";
export { defineCommandRunner } from "@univocity-tools/cli-kit";
import { verbosityArgs } from "@univocity-tools/cli-kit/reporting";
import { foundryBinArgs } from "@univocity-tools/foundry-exec/commoncli";
import { forgeArgs } from "@univocity-tools/forge-options/commoncli";
import { gitArgs } from "@univocity-tools/git-options/commoncli";
import type { ArgsDef, CommandDef } from "citty";

/**
 * Flags shared by every Cart command and subcommand.
 *
 * Options only — no positional args. citty does not inherit parent flags
 * into child `args`; merge these on each command via `defineCartCommand`
 * or `withCartArgs`.
 */
export const commonArgs = {
  ...verbosityArgs,
  ...commonOptionArgs,
  ...forgeArgs,
  ...foundryBinArgs,
} as const satisfies ArgsDef;

export type CartCommonArgs = {
  verbosity?: string;
  sourceRoot?: string;
  workDir?: string;
  forgeConfig?: string;
  buildRoot?: string;
  foundryOut?: string;
  foundrySrc?: string;
  foundryCache?: string;
  foundryLibs?: string;
};

/** Merge Cart-wide flags into a command-specific `args` object. */
export function withCartArgs<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(commonArgs, args) as ArgsDef & T;
}

/** `defineCommand` with Cart-wide flags merged into `args`. */
export function defineCartCommand<T extends ArgsDef>(
  def: CommandDef<T>,
): CommandDef<T> {
  return defineAppCommand(commonArgs, def);
}

/** Citty flags for `fetch-release` (git options + release selector). */
export const fetchReleaseArgs = {
  ...gitArgs,
  release: {
    type: "string",
    description: "Git tag for the release to fetch (default: latest release)",
    valueHint: "tag",
  },
  artefact: {
    type: "string",
    description:
      "Artefact base name or full file name to fetch (default: all)",
    valueHint: "name",
  },
} as const satisfies ArgsDef;

/** Citty flags for `fetch-run` (git options + run selector). */
export const fetchRunArgs = {
  ...gitArgs,
  "run-id": {
    type: "string",
    description:
      "Workflow run database id to fetch (default: latest successful run)",
    valueHint: "id",
  },
  branch: {
    type: "string",
    description: "Branch filter when resolving the latest workflow run",
    valueHint: "name",
  },
  artefact: {
    type: "string",
    description:
      "Artefact base name or full file name to fetch (default: all)",
    valueHint: "name",
  },
} as const satisfies ArgsDef;
