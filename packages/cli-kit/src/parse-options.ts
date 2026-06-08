import type { CommandContext } from "citty";
import type { LooseParsedArgs } from "./citty-args.js";
import { createOut, type Out } from "./reporting/out.js";
import { resolveVerbosity } from "./reporting/verbosity.js";

/** Callable command body: `Out` plus typed options, no citty types. */
export type CommandHandler<TOptions> = (
  out: Out,
  options: TOptions,
) => void | Promise<void>;

/** Map citty parsed args to a typed options object. */
export type OptionsParser<TOptions> = (args: LooseParsedArgs) => TOptions;

/**
 * Connect citty `run` to a typed handler: parse args, then call `execute`.
 * Use in `apps/` command modules only — keep `execute` in
 * `packages/<app>/main.ts`.
 */
export function defineCommandRunner<TOptions>(
  parse: OptionsParser<TOptions>,
  execute: CommandHandler<TOptions>,
): (context: CommandContext) => Promise<void> {
  return async ({ args, rawArgs }) => {
    const verbosity = resolveVerbosity(args as LooseParsedArgs, rawArgs);
    const out = createOut(verbosity);
    await execute(out, parse(args as LooseParsedArgs));
  };
}
