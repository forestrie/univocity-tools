import type { FoundryExecContext } from "./require-bins.js";

export type SpawnResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

async function runBin(
  ctx: FoundryExecContext,
  bin: string,
  argv: string[],
): Promise<SpawnResult> {
  const proc = Bun.spawn([bin, ...argv], {
    cwd: ctx.cwd ?? process.cwd(),
    env: process.env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (stderr.length > 0) {
    ctx.out.log("%s", stderr);
  }

  return { stdout, stderr, exitCode };
}

function throwOnFailure(
  tool: string,
  argv: string[],
  result: SpawnResult,
): void {
  if (result.exitCode === 0) {
    return;
  }
  const cmd = `${tool} ${argv.join(" ")}`;
  const detail = result.stderr.trim() || result.stdout.trim() || "failed";
  throw new Error(`${cmd} failed (${result.exitCode}): ${detail}`);
}

export async function runForge(
  ctx: FoundryExecContext,
  argv: string[],
): Promise<SpawnResult> {
  const result = await runBin(ctx, ctx.forgeBin, argv);
  throwOnFailure("forge", argv, result);
  return result;
}

export async function runCast(
  ctx: FoundryExecContext,
  argv: string[],
): Promise<SpawnResult> {
  const result = await runBin(ctx, ctx.castBin, argv);
  throwOnFailure("cast", argv, result);
  return result;
}
