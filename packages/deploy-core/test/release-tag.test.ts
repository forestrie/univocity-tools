import { describe, expect, test } from "bun:test";
import { normalizeUnivocityReleaseTag } from "../release-tag.js";

describe("normalizeUnivocityReleaseTag", () => {
  test("keeps v-prefixed tags", () => {
    expect(normalizeUnivocityReleaseTag("v0.1.4")).toBe("v0.1.4");
  });

  test("adds v prefix to bare semver", () => {
    expect(normalizeUnivocityReleaseTag("0.1.5")).toBe("v0.1.5");
  });

  test("trims whitespace", () => {
    expect(normalizeUnivocityReleaseTag("  v0.1.4  ")).toBe("v0.1.4");
  });

  test("passes through latest", () => {
    expect(normalizeUnivocityReleaseTag("latest")).toBe("latest");
    expect(normalizeUnivocityReleaseTag("  LATEST  ")).toBe("latest");
  });

  test("rejects empty input", () => {
    expect(() => normalizeUnivocityReleaseTag("  ")).toThrow(
      "release tag is required",
    );
  });
});
