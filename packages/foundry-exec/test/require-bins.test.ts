import { describe, expect, test } from "bun:test";
import { requireCastBin, requireForgeBin } from "../require-bins.js";

describe("requireForgeBin", () => {
  test("returns path when resolved", () => {
    expect(requireForgeBin({ forgeBin: "/usr/bin/forge" })).toBe(
      "/usr/bin/forge",
    );
  });

  test("throws when false", () => {
    expect(() => requireForgeBin({ forgeBin: false })).toThrow(
      "forge binary not found",
    );
  });
});

describe("requireCastBin", () => {
  test("returns path when resolved", () => {
    expect(requireCastBin({ castBin: "/usr/bin/cast" })).toBe("/usr/bin/cast");
  });

  test("throws when false", () => {
    expect(() => requireCastBin({ castBin: false })).toThrow(
      "cast binary not found",
    );
  });
});
