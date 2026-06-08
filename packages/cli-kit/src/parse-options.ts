import type { ArgsDef, CommandContext } from "citty";
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
 *
 * `TArgs` is inferred from the command's `run` slot (`CommandContext<TArgs>`)
 * so the runner matches commands that declare specific `args` literals under
 * `exactOptionalPropertyTypes`; it always reads args loosely at runtime.
 */
export function defineCommandRunner<TOptions, TArgs extends ArgsDef = ArgsDef>(
  parse: OptionsParser<TOptions>,
  execute: CommandHandler<TOptions>,
): (context: CommandContext<TArgs>) => Promise<void> {
  return async ({ args, rawArgs }) => {
    const verbosity = resolveVerbosity(args as LooseParsedArgs, rawArgs);
    const out = createOut(verbosity);
    await execute(out, parse(args as LooseParsedArgs));
  };
}
