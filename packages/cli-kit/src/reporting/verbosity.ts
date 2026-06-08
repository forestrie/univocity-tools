import type { LooseParsedArgs } from "../citty-args.js";

export type Verbosity = number;

function parseVerbosityValue(raw: string): Verbosity | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid verbosity value: ${raw}`);
  }
  return parsed;
}

function readExplicitVerbosity(args: LooseParsedArgs): Verbosity | undefined {
  const raw = args.verbosity ?? args.v;
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw === "number") {
    if (!Number.isInteger(raw)) {
      throw new Error(`Invalid verbosity value: ${raw}`);
    }
    return raw;
  }
  if (typeof raw === "string") {
    return parseVerbosityValue(raw);
  }
  return undefined;
}

function countStandaloneVerboseFlags(rawArgs: string[]): number {
  let count = 0;
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === "-v") {
      const next = rawArgs[i + 1];
      if (next !== undefined && /^-?\d+$/.test(next)) {
        i += 1;
        continue;
      }
      count += 1;
      continue;
    }
    if (arg === "--verbosity") {
      const next = rawArgs[i + 1];
      if (next !== undefined && /^-?\d+$/.test(next)) {
        i += 1;
        continue;
      }
      count += 1;
    }
  }
  return count;
}

/**
 * Resolve output verbosity from citty parsed args and raw argv.
 *
 * - Explicit `--verbosity N` / `-v N` wins over repeated `-v`.
 * - Repeated standalone `-v` tokens: level = max(0, count - 1).
 * - Default when unset: 0.
 */
export function resolveVerbosity(
  args: LooseParsedArgs,
  rawArgs?: string[],
): Verbosity {
  const explicit = readExplicitVerbosity(args);
  if (explicit !== undefined) {
    return explicit;
  }

  if (rawArgs !== undefined) {
    const count = countStandaloneVerboseFlags(rawArgs);
    if (count > 0) {
      return Math.max(0, count - 1);
    }
  }

  return 0;
}
