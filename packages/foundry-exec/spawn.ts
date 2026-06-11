import {
  formatProcessFailure,
  runProcess,
  type RunProcessResult,
} from "@univocity-tools/subprocess";
import type { FoundryExecContext } from "./require-bins.js";

export type SpawnResult = RunProcessResult;

async function runBin(
  ctx: FoundryExecContext,
  bin: string,
  argv: string[],
): Promise<SpawnResult> {
  const result = await runProcess([bin, ...argv], {
    cwd: ctx.cwd ?? process.cwd(),
    env: process.env,
  });

  if (result.stderr.length > 0) {
    ctx.out.log("%s", result.stderr);
  }

  return result;
}

function throwOnFailure(
  tool: string,
  argv: string[],
  result: SpawnResult,
): void {
  if (result.exitCode === 0) {
    return;
  }
  throw new Error(formatProcessFailure(`${tool} ${argv.join(" ")}`, result));
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
