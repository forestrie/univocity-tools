import { describe, expect, test } from "bun:test";
import type { CommandContext } from "citty";
import { type LooseParsedArgs, defineCommandRunner } from "../src/index.js";

describe("defineCommandRunner", () => {
  test("parses args then calls execute", async () => {
    type Options = { name: string; loud: boolean };

    const run = defineCommandRunner<Options>(
      (args) => ({
        name: String(args.name ?? args._?.[0]),
        loud: args.loud === true,
      }),
      (options) => {
        expect(options).toEqual({ name: "alice", loud: true });
      },
    );

    const context = {
      rawArgs: ["alice", "--loud"],
      args: { _: ["alice"], name: "alice", loud: true } as LooseParsedArgs,
      cmd: {},
    } as CommandContext;

    await run(context);
  });
});
