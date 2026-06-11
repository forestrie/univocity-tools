import { describe, expect, test } from "bun:test";
import path from "node:path";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import {
  parseArchiveExtractOptions,
  parseArchiveOptions,
  parseValidateBatchOptions,
} from "../options.js";

/** Expected forge/common fields for a univocity root with default config. */
function commonExpected(univocityRoot: string) {
  return {
    univocityRoot,
    workDir: path.resolve(univocityRoot, ".work"),
    forgeConfig: path.resolve(univocityRoot, "foundry.toml"),
    buildRoot: univocityRoot,
    outDir: path.resolve(univocityRoot, "out"),
    srcDir: path.resolve(univocityRoot, "src"),
    cacheDir: path.resolve(univocityRoot, "cache"),
    libsDir: path.resolve(univocityRoot, "lib"),
    ...parseFoundryBinOptions({}),
  };
}

describe("parseValidateBatchOptions", () => {
  test("maps citty args to ValidateBatchOptions with absolute paths", () => {
    const options = parseValidateBatchOptions({
      _: ["./batch.json"],
      path: "./batch.json",
      "source-root": "/tmp/univocity",
    });

    const univocityRoot = path.resolve(process.cwd(), "/tmp/univocity");
    expect(options).toEqual({
      ...commonExpected(univocityRoot),
      path: "./batch.json",
    });
  });

  test("resolves relative forge-config under univocity root", () => {
    const options = parseValidateBatchOptions({
      _: ["./batch.json"],
      path: "./batch.json",
      "source-root": "/tmp/univocity",
      "forge-config": "script/create3-factory/foundry.toml",
    });

    expect(options.forgeConfig).toBe(
      path.resolve("/tmp/univocity", "script/create3-factory/foundry.toml"),
    );
    expect(options.outDir).toBe(
      path.resolve("/tmp/univocity", "script/create3-factory/out"),
    );
  });
});

describe("parseArchiveOptions", () => {
  test("defaults archive name to build and resolves work dir", () => {
    const options = parseArchiveOptions({
      "source-root": "/tmp/univocity",
    });
    const univocityRoot = path.resolve(process.cwd(), "/tmp/univocity");
    expect(options).toEqual({
      ...commonExpected(univocityRoot),
      archiveName: "build",
    });
  });

  test("reads --archive-name and --work-dir overrides", () => {
    const options = parseArchiveOptions({
      "source-root": "/tmp/univocity",
      "work-dir": "build-out",
      "archive-name": "factory",
    });
    expect(options.workDir).toBe(path.resolve("/tmp/univocity", "build-out"));
    expect(options.archiveName).toBe("factory");
  });
});

describe("parseArchiveExtractOptions", () => {
  test("resolves archive under work dir and release root from env", () => {
    const prev = process.env.RELEASE_ROOT;
    process.env.RELEASE_ROOT = "/tmp/release";
    try {
      const options = parseArchiveExtractOptions({
        _: ["build.tar.gz"],
        archive: "build.tar.gz",
        "source-root": "/tmp/univocity",
        "release-root": "${env:RELEASE_ROOT}",
      });
      const univocityRoot = path.resolve(process.cwd(), "/tmp/univocity");
      expect(options.archive).toBe(
        path.resolve(univocityRoot, ".work", "build.tar.gz"),
      );
      expect(options.releaseRoot).toBe(path.resolve("/tmp/release"));
    } finally {
      if (prev === undefined) {
        delete process.env.RELEASE_ROOT;
      } else {
        process.env.RELEASE_ROOT = prev;
      }
    }
  });

  test("falls back to cwd when RELEASE_ROOT is unset", () => {
    const prev = process.env.RELEASE_ROOT;
    delete process.env.RELEASE_ROOT;
    try {
      const options = parseArchiveExtractOptions({
        _: ["build.tar.gz"],
        "source-root": "/tmp/univocity",
      });
      expect(options.releaseRoot).toBe(path.resolve(process.cwd()));
    } finally {
      if (prev === undefined) {
        delete process.env.RELEASE_ROOT;
      } else {
        process.env.RELEASE_ROOT = prev;
      }
    }
  });

  test("reads explicit --release-root override", () => {
    const options = parseArchiveExtractOptions({
      _: ["artifacts/build.tar.gz"],
      "source-root": "/tmp/univocity",
      "release-root": "/custom/release",
    });
    expect(options.archive).toBe(
      path.resolve("/tmp/univocity", ".work", "artifacts/build.tar.gz"),
    );
    expect(options.releaseRoot).toBe(path.resolve("/custom/release"));
  });

  test("throws when archive path is missing", () => {
    expect(() =>
      parseArchiveExtractOptions({ "source-root": "/tmp/univocity" }),
    ).toThrow("archive path is required");
  });
});
