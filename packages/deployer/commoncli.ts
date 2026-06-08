import { defineAppCommand, mergeCommandArgs } from "@univocity-tools/cli-kit";
export { defineCommandRunner } from "@univocity-tools/cli-kit";
import { verbosityArgs } from "@univocity-tools/cli-kit/reporting";
import { create3Args } from "@univocity-tools/create3-options/commoncli";
import { foundryBinArgs } from "@univocity-tools/foundry-exec/commoncli";
import { forgeArgs } from "@univocity-tools/forge-options/commoncli";
import type { ArgsDef, CommandDef } from "citty";
import { signerArgs } from "./signer-options.js";

const deployerOnlyArgs = {
  "univocity-root": {
    type: "string",
    description:
      "Path to the contracts repo checkout (overrides UNIVOCITY_ROOT; " +
      "otherwise discovered from a git repo named univocity, else cwd)",
    valueHint: "path",
  },
  "rpc-url": {
    type: "string",
    description: "RPC endpoint (default: RPC_URL env)",
    valueHint: "url",
  },
} as const satisfies ArgsDef;

/**
 * Flags shared by every deployer command and subcommand.
 */
export const commonArgs = {
  ...verbosityArgs,
  ...deployerOnlyArgs,
  ...signerArgs,
  ...forgeArgs,
  ...foundryBinArgs,
  ...create3Args,
} as const satisfies ArgsDef;

/** Merge deployer-wide flags into a command-specific `args` object. */
export function withDeployerArgs<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(commonArgs, args) as ArgsDef & T;
}

/** `defineCommand` with deployer-wide flags merged into `args`. */
export function defineDeployerCommand<T extends ArgsDef>(
  def: CommandDef<T>,
): CommandDef<T> {
  return defineAppCommand(commonArgs, def);
}
