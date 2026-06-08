import { describe, expect, test } from "bun:test";
import { createCaptureOut } from "../../src/reporting/out.js";

describe("createCaptureOut", () => {
  test("out always records", () => {
    const out = createCaptureOut(-1);
    out.out("pipe me");
    expect(out.lines).toEqual([
      { stream: "stdout", channel: "out", text: "pipe me" },
    ]);
  });

  test("print and warn hidden at verbosity -1", () => {
    const out = createCaptureOut(-1);
    out.print("feedback");
    out.warn("warning");
    expect(out.lines).toHaveLength(0);
  });

  test("print and warn shown at verbosity 0", () => {
    const out = createCaptureOut(0);
    out.print("feedback");
    out.warn("warning");
    expect(out.lines).toEqual([
      { stream: "stderr", channel: "print", text: "feedback" },
      { stream: "stderr", channel: "warn", text: "warning" },
    ]);
  });

  test("log shown only when verbosity > 2", () => {
    const quiet = createCaptureOut(2);
    quiet.log("trace");
    expect(quiet.lines).toHaveLength(0);

    const verbose = createCaptureOut(3);
    verbose.log("trace");
    expect(verbose.lines).toEqual([
      { stream: "stderr", channel: "log", text: "trace" },
    ]);
  });

  test("supports printf-style formatting", () => {
    const out = createCaptureOut(0);
    out.print("hello %s", "world");
    expect(out.lines[0]?.text).toBe("hello world");
  });
});
