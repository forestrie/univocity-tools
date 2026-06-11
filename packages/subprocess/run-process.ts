export type RunProcessResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type RunProcessOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

/** Format a non-zero exit as a human-readable error message. */
export function formatProcessFailure(
  command: string,
  result: RunProcessResult,
): string {
  const detail = result.stderr.trim() || result.stdout.trim() || "failed";
  return `${command} failed (${result.exitCode}): ${detail}`;
}

/**
 * Run an external program via Bun.spawn and capture stdout, stderr, and exit
 * code. Throws when the binary cannot be started (ENOENT).
 */
export async function runProcess(
  argv: string[],
  options?: RunProcessOptions,
): Promise<RunProcessResult> {
  let proc: Bun.Subprocess<"ignore", "pipe", "pipe">;
  try {
    proc = Bun.spawn(argv, {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
      ...(options?.cwd !== undefined ? { cwd: options.cwd } : {}),
      env: options?.env ?? process.env,
    });
  } catch (cause) {
    throw new Error(
      `${argv[0]} is required but could not be started; install it and retry`,
      { cause },
    );
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}
