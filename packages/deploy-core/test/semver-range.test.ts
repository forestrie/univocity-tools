import { describe, expect, test } from "bun:test";
import { satisfiesCaretRange } from "../semver-range.js";

describe("satisfiesCaretRange", () => {
  test("matches caret ranges on the same major", () => {
    expect(satisfiesCaretRange("v0.4.1", "^0.4.0")).toBe(true);
    expect(satisfiesCaretRange("v0.5.0", "^0.4.0")).toBe(false);
    expect(satisfiesCaretRange("v0.3.9", "^0.4.0")).toBe(false);
  });

  test("rejects unsupported range operators", () => {
    expect(() => satisfiesCaretRange("v1.0.0", ">=1.0.0")).toThrow(
      /caret required/,
    );
  });
});
