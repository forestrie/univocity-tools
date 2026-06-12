import { describe, expect, test } from "bun:test";
import path from "node:path";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import {
  parseArchiveExtractOptions,
  parseArchiveOptions,
  parseReleaseIdOptions,
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
      autoReleaseId: false,
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

  test("omits release id when --release-id is absent", () => {
    const options = parseArchiveOptions({ "source-root": "/tmp/univocity" });
    expect(options.releaseId).toBeUndefined();
    expect(options.autoReleaseId).toBe(false);
  });

  test("uses an explicit --release-id value", () => {
    const options = parseArchiveOptions({
      "source-root": "/tmp/univocity",
      "release-id": "v0.1.1+260612-0594a39e",
    });
    expect(options.releaseId).toBe("v0.1.1+260612-0594a39e");
    expect(options.autoReleaseId).toBe(false);
  });

  test("auto-derives when --release-id is present but empty", () => {
    const options = parseArchiveOptions({
      "source-root": "/tmp/univocity",
      "release-id": "",
    });
    expect(options.releaseId).toBeUndefined();
    expect(options.autoReleaseId).toBe(true);
  });
});

describe("parseReleaseIdOptions", () => {
  test("defaults to no bump and full release id", () => {
    const options = parseReleaseIdOptions({ "source-root": "/tmp/univocity" });
    expect(options.bump).toBeUndefined();
    expect(options.semverOnly).toBe(false);
  });

  test("maps each --next-* flag to a bump level", () => {
    expect(
      parseReleaseIdOptions({
        "source-root": "/tmp/univocity",
        "next-major": true,
      }).bump,
    ).toBe("major");
    expect(
      parseReleaseIdOptions({
        "source-root": "/tmp/univocity",
        "next-patch": true,
      }).bump,
    ).toBe("patch");
  });

  test("--next aliases --next-minor", () => {
    expect(
      parseReleaseIdOptions({ "source-root": "/tmp/univocity", next: true })
        .bump,
    ).toBe("minor");
  });

  test("--next and --next-minor together are not a conflict", () => {
    expect(
      parseReleaseIdOptions({
        "source-root": "/tmp/univocity",
        next: true,
        "next-minor": true,
      }).bump,
    ).toBe("minor");
  });

  test("throws when distinct bump levels conflict", () => {
    expect(() =>
      parseReleaseIdOptions({
        "source-root": "/tmp/univocity",
        "next-minor": true,
        "next-patch": true,
      }),
    ).toThrow("--next-* flags are mutually exclusive");
  });

  test("reads --semver", () => {
    expect(
      parseReleaseIdOptions({
        "source-root": "/tmp/univocity",
        semver: true,
      }).semverOnly,
    ).toBe(true);
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
