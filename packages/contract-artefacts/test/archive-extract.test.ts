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
import {
  parseArchiveExtractOptions,
  parseArchiveOptions,
} from "../options.js";

const haveTools = Bun.which("rsync") !== null && Bun.which("tar") !== null;

function writeFile(file: string, contents: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

describe.skipIf(!haveTools)("runArchiveExtract", () => {
  test("round-trip archive then extract hydrates sources", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "archive-extract-"));
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

      expect(
        existsSync(path.join(releaseRoot, "out", "Foo.sol", "Foo.json")),
      ).toBe(true);
      expect(
        existsSync(
          path.join(releaseRoot, "cache", "solidity-files-cache.json"),
        ),
      ).toBe(true);
      expect(
        readFileSync(path.join(releaseRoot, "src", "Foo.sol"), "utf8"),
      ).toBe("pragma solidity ^0.8.0;");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("throws when archive file is missing", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "archive-extract-"));
    try {
      const options = parseArchiveExtractOptions({
        _: ["missing.tar.gz"],
        "source-root": root,
        "release-root": path.join(root, "release"),
      });
      await expect(
        runArchiveExtract(createNullOut(), options),
      ).rejects.toThrow(/build archive not found/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
