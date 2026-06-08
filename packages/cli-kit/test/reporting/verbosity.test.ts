import { describe, expect, test } from "bun:test";
import { resolveVerbosity } from "../../src/reporting/verbosity.js";

describe("resolveVerbosity", () => {
  test("defaults to 0 when unset", () => {
    expect(resolveVerbosity({})).toBe(0);
    expect(resolveVerbosity({}, [])).toBe(0);
  });

  test("reads explicit --verbosity", () => {
    expect(resolveVerbosity({ verbosity: "3" })).toBe(3);
    expect(resolveVerbosity({ verbosity: "-1" })).toBe(-1);
    expect(resolveVerbosity({ v: "2" })).toBe(2);
  });

  test("counts repeated standalone -v flags", () => {
    expect(resolveVerbosity({}, ["-v"])).toBe(0);
    expect(resolveVerbosity({}, ["-v", "-v"])).toBe(1);
    expect(resolveVerbosity({}, ["-v", "-v", "-v", "-v"])).toBe(3);
  });

  test("explicit value wins over repeated -v", () => {
    expect(resolveVerbosity({ verbosity: "2" }, ["-v", "-v", "-v"])).toBe(2);
  });

  test("skips -v tokens followed by numeric values when counting", () => {
    expect(resolveVerbosity({}, ["-v", "3"])).toBe(0);
    expect(resolveVerbosity({ v: "3" }, ["-v", "3"])).toBe(3);
  });

  test("throws on invalid verbosity", () => {
    expect(() => resolveVerbosity({ verbosity: "loud" })).toThrow(
      /Invalid verbosity/,
    );
  });
});
