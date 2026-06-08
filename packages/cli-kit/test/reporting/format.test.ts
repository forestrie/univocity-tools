import { describe, expect, test } from "bun:test";
import { formatMessage } from "../../src/reporting/format.js";

describe("formatMessage", () => {
  test("returns the string when no extra args", () => {
    expect(formatMessage("hello")).toBe("hello");
  });

  test("formats with placeholders when extra args present", () => {
    expect(formatMessage("hello %s", "world")).toBe("hello world");
    expect(formatMessage("count %d", 3)).toBe("count 3");
  });
});
