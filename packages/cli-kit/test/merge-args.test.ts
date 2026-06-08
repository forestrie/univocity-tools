import { describe, expect, test } from "bun:test";
import type { ArgsDef } from "citty";
import { mergeCommandArgs } from "../src/merge-args.js";

describe("mergeCommandArgs", () => {
  const common = {
    verbose: { type: "boolean" as const, alias: ["v"] },
  };

  test("returns common when specific is omitted", () => {
    expect(mergeCommandArgs(common)).toEqual(common);
  });

  test("merges plain specific args", () => {
    expect(
      mergeCommandArgs(common, {
        path: { type: "positional", required: true },
      }),
    ).toEqual({
      verbose: common.verbose,
      path: { type: "positional", required: true },
    });
  });

  test("merges async specific args", async () => {
    const merged = mergeCommandArgs(common, async () => ({
      path: { type: "positional", required: true },
    }));
    expect(typeof merged).toBe("function");
    const resolved = await (merged as () => Promise<ArgsDef>)();
    expect(resolved.verbose).toEqual(common.verbose);
    expect(resolved.path).toEqual({ type: "positional", required: true });
  });
});
