import { describe, expect, test } from "bun:test";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runArchive } from "../archive.js";
import { runArchiveExtract } from "../archive-extract.js";
import { runArchiveValidate } from "../archive-validate.js";
import {
  parseArchiveExtractOptions,
  parseArchiveOptions,
  parseArchiveValidateOptions,
} from "../options.js";

const haveTools = Bun.which("rsync") !== null && Bun.which("tar") !== null;

function writeFile(file: string, contents: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

describe.skipIf(!haveTools)("runArchiveValidate", () => {
  test("validates release root after archive round-trip", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "archive-validate-"));
    const releaseRoot = path.join(root, "release");
    try {
      writeFile(path.join(root, "out", "Foo.sol", "Foo.json"), '{"abi":[]}');
      writeFile(
        path.join(root, "out", "build-info", "abc123.json"),
        JSON.stringify({
          input: {
            sources: {
              "src/Foo.sol": { content: "pragma solidity ^0.8.0;" },
            },
          },
        }),
      );
      writeFile(
        path.join(root, "cache", "solidity-files-cache.json"),
        '{"_format":"hh-sol-cache-2","files":{}}',
      );
      writeFile(path.join(root, "src", "Foo.sol"), "pragma solidity ^0.8.0;");

      const archiveOptions = parseArchiveOptions({ "source-root": root });
      await runArchive(createNullOut(), archiveOptions);

      const archivePath = path.join(root, ".work", "build.tar.gz");
      expect(existsSync(archivePath)).toBe(true);

      const extractOptions = parseArchiveExtractOptions({
        _: ["build.tar.gz"],
        "source-root": root,
        "release-root": releaseRoot,
      });
      await runArchiveExtract(createNullOut(), extractOptions);

      const validateOptions = parseArchiveValidateOptions({
        "source-root": root,
        "release-root": releaseRoot,
      });
      await runArchiveValidate(createNullOut(), validateOptions);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("throws when out trees differ", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "archive-validate-"));
    const releaseRoot = path.join(root, "release");
    try {
      writeFile(path.join(root, "out", "Foo.sol", "Foo.json"), '{"abi":[]}');
      writeFile(
        path.join(root, "cache", "solidity-files-cache.json"),
        '{"_format":"hh-sol-cache-2","files":{}}',
      );
      writeFile(
        path.join(releaseRoot, "out", "Foo.sol", "Foo.json"),
        '{"abi":["changed"]}',
      );
      writeFile(
        path.join(releaseRoot, "cache", "solidity-files-cache.json"),
        '{"_format":"hh-sol-cache-2","files":{}}',
      );

      const validateOptions = parseArchiveValidateOptions({
        "source-root": root,
        "release-root": releaseRoot,
      });
      await expect(
        runArchiveValidate(createNullOut(), validateOptions),
      ).rejects.toThrow(/diff/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("throws when hydrated source differs from checkout", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "archive-validate-"));
    const releaseRoot = path.join(root, "release");
    try {
      writeFile(path.join(root, "out", "Foo.sol", "Foo.json"), '{"abi":[]}');
      writeFile(
        path.join(root, "out", "build-info", "abc123.json"),
        JSON.stringify({
          input: {
            sources: {
              "src/Foo.sol": { content: "pragma solidity ^0.8.0;" },
            },
          },
        }),
      );
      writeFile(
        path.join(root, "cache", "solidity-files-cache.json"),
        '{"_format":"hh-sol-cache-2","files":{}}',
      );
      writeFile(path.join(root, "src", "Foo.sol"), "pragma solidity ^0.8.0;");

      const archiveOptions = parseArchiveOptions({ "source-root": root });
      await runArchive(createNullOut(), archiveOptions);

      const extractOptions = parseArchiveExtractOptions({
        _: ["build.tar.gz"],
        "source-root": root,
        "release-root": releaseRoot,
      });
      await runArchiveExtract(createNullOut(), extractOptions);

      writeFile(path.join(root, "src", "Foo.sol"), "pragma solidity ^0.8.1;");

      const validateOptions = parseArchiveValidateOptions({
        "source-root": root,
        "release-root": releaseRoot,
      });
      await expect(
        runArchiveValidate(createNullOut(), validateOptions),
      ).rejects.toThrow(/hydrated source differs/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
