import { describe, expect, test } from "bun:test";
import path from "node:path";
import { resolveReleaseRoot } from "../src/release-root.js";

describe("resolveReleaseRoot", () => {
  test("returns undefined when flag and env are absent", () => {
    const prev = process.env.RELEASE_ROOT;
    delete process.env.RELEASE_ROOT;
    try {
      expect(resolveReleaseRoot({})).toBeUndefined();
    } finally {
      if (prev === undefined) {
        delete process.env.RELEASE_ROOT;
      } else {
        process.env.RELEASE_ROOT = prev;
      }
    }
  });

  test("resolves explicit --release-root to an absolute path", () => {
    expect(resolveReleaseRoot({ "release-root": "/tmp/release" })).toBe(
      path.resolve("/tmp/release"),
    );
  });

  test("resolves ${env:RELEASE_ROOT}", () => {
    const prev = process.env.RELEASE_ROOT;
    process.env.RELEASE_ROOT = "/tmp/from-env";
    try {
      expect(
        resolveReleaseRoot({ "release-root": "${env:RELEASE_ROOT}" }),
      ).toBe(path.resolve("/tmp/from-env"));
    } finally {
      if (prev === undefined) {
        delete process.env.RELEASE_ROOT;
      } else {
        process.env.RELEASE_ROOT = prev;
      }
    }
  });
});
