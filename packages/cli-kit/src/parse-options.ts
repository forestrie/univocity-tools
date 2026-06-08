import type { CommandContext } from "citty";
import type { LooseParsedArgs } from "./citty-args.js";

/** Callable command body: typed options in, no citty types. */
export type CommandHandler<TOptions> = (
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
  return async ({ args }) => {
    await execute(parse(args as LooseParsedArgs));
  };
}
