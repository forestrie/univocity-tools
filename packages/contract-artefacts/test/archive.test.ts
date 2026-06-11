import { describe, expect, test } from "bun:test";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runArchive } from "../archive.js";
import { parseArchiveOptions } from "../options.js";

const haveTools = Bun.which("rsync") !== null && Bun.which("tar") !== null;

function writeFile(file: string, contents: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

async function tarEntries(archivePath: string): Promise<string[]> {
  const proc = Bun.spawn(["tar", "-tzf", archivePath], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  expect(exitCode).toBe(0);
  return stdout.split("\n").filter((line) => line.length > 0);
}

describe.skipIf(!haveTools)("runArchive", () => {
  test("packages out/ and solidity-files-cache.json into a tar.gz", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "archive-"));
    try {
      writeFile(path.join(root, "out", "Foo.sol", "Foo.json"), '{"abi":[]}');
      writeFile(
        path.join(root, "out", "build-info", "abc123.json"),
        '{"id":"abc123"}',
      );
      writeFile(
        path.join(root, "cache", "solidity-files-cache.json"),
        '{"_format":"hh-sol-cache-2","files":{}}',
      );

      const options = parseArchiveOptions({ "source-root": root });
      await runArchive(createNullOut(), options);

      const archivePath = path.join(root, ".work", "build.tar.gz");
      expect(existsSync(archivePath)).toBe(true);
      expect(
        existsSync(
          path.join(root, ".work", "build", "out", "Foo.sol", "Foo.json"),
        ),
      ).toBe(true);

      const entries = await tarEntries(archivePath);
      expect(entries).toContain("build/out/Foo.sol/Foo.json");
      expect(entries).toContain("build/out/build-info/abc123.json");
      expect(entries).toContain("build/cache/solidity-files-cache.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("throws a clear error when forge build output is missing", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "archive-"));
    try {
      const options = parseArchiveOptions({ "source-root": root });
      await expect(runArchive(createNullOut(), options)).rejects.toThrow(
        /run forge build first/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
