/** Narrowed options for subprocess helpers — only execution-relevant fields. */
export type FoundryExecContext = {
  forgeBin: string;
  castBin: string;
  verbose: boolean;
  cwd?: string;
};

export function requireForgeBin(options: {
  forgeBin: string | false;
}): string {
  if (options.forgeBin === false) {
    throw new Error(
      "forge binary not found; install Foundry or pass --forge-bin",
    );
  }
  return options.forgeBin;
}

export function requireCastBin(options: { castBin: string | false }): string {
  if (options.castBin === false) {
    throw new Error("cast binary not found; install Foundry or pass --cast-bin");
  }
  return options.castBin;
}

export function toFoundryExecContext(options: {
  forgeBin: string | false;
  castBin: string | false;
  verbose: boolean;
  cwd?: string;
}): FoundryExecContext {
  return {
    forgeBin: requireForgeBin(options),
    castBin: requireCastBin(options),
    verbose: options.verbose,
    ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
  };
}
