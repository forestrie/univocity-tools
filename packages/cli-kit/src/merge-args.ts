import {
  defineCommand,
  type ArgsDef,
  type CommandDef,
  type Resolvable,
} from "citty";

/** Citty `args` may be a plain object or an async/sync factory. */
export type ResolvableArgs = Resolvable<ArgsDef>;

async function resolveArgsDef(
  args: ResolvableArgs | undefined,
): Promise<ArgsDef> {
  if (args === undefined) {
    return {};
  }
  const value = typeof args === "function" ? await args() : await args;
  return value ?? {};
}

/**
 * Merge tool-wide CLI flags into a command's `args`.
 *
 * Put **options only** (boolean/string/enum) in `common` — not positional
 * args. Command-specific positionals stay on `specific`.
 */
export function mergeCommandArgs(
  common: ArgsDef,
  specific?: ResolvableArgs,
): ResolvableArgs {
  if (specific === undefined) {
    return common;
  }
  if (typeof specific === "function") {
    return async () => ({
      ...common,
      ...(await resolveArgsDef(specific)),
    });
  }
  return { ...common, ...(specific as ArgsDef) };
}

/**
 * Wrap `defineCommand` so every node in the tree gets `commonArgs`.
 */
export function defineAppCommand<T extends ArgsDef>(
  commonArgs: ArgsDef,
  def: CommandDef<T>,
): CommandDef<T> {
  const merged = mergeCommandArgs(commonArgs, def.args);
  return defineCommand({
    ...def,
    args: merged,
  } as CommandDef<T>);
}
