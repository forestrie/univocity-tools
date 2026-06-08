import { describe, expect, test } from "bun:test";
import { runMain } from "citty";
import command, { VERSION } from "../src/command";

async function withStubbedExit<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; logs: string[] }> {
  const logs: string[] = [];
  const log = console.log;
  const exit = process.exit;

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  process.exit = ((code?: number) => {
    throw new Error(`process.exit(${code ?? 0})`);
  }) as typeof process.exit;

  try {
    const result = await fn();
    return { result, logs };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("process.exit(")) {
      return { result: undefined as T, logs };
    }
    throw error;
  } finally {
    console.log = log;
    process.exit = exit;
  }
}

describe("builder CLI", () => {
  test("--help", async () => {
    const { logs } = await withStubbedExit(() =>
      runMain(command, { rawArgs: ["--help"] }),
    );
    expect(logs.join("\n")).toContain("builder");
    expect(logs.join("\n")).toContain("validate");
  });

  test("--version", async () => {
    const { logs } = await withStubbedExit(() =>
      runMain(command, { rawArgs: ["--version"] }),
    );
    expect(logs).toEqual(["0.1.0"]);
    expect(VERSION).toBe("0.1.0");
  });
});
