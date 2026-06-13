import { describe, expect, test } from "bun:test";
import { DEFAULT_AUTH_KIND, normalizeAuthKind } from "../auth/auth-kind.js";

describe("normalizeAuthKind", () => {
  test("defaults to gh-cli", () => {
    expect(normalizeAuthKind(undefined)).toBe(DEFAULT_AUTH_KIND);
  });

  test("accepts env", () => {
    expect(normalizeAuthKind("ENV")).toBe("env");
  });

  test("rejects unknown values", () => {
    expect(() => normalizeAuthKind("pat")).toThrow(/invalid auth kind/);
  });
});
