import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_CAST_BIN,
  DEFAULT_FORGE_BIN,
  resolveExecutableBin,
} from "../resolve-bin.js";

describe("resolveExecutableBin", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("resolves forge from PATH when available", () => {
    const resolved = resolveExecutableBin(undefined, DEFAULT_FORGE_BIN);
    if (Bun.which(DEFAULT_FORGE_BIN)) {
      expect(resolved).toBeString();
      expect(resolved).not.toBe(false);
    } else {
      expect(resolved).toBe(false);
    }
  });

  test("returns false for missing cwd-relative binary", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-exec-"));
    expect(
      resolveExecutableBin("missing-forge", DEFAULT_FORGE_BIN, tmpDir),
    ).toBe(false);
  });

  test("resolves executable file relative to cwd", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-exec-"));
    const binPath = path.join(tmpDir, "local-cast");
    fs.writeFileSync(binPath, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    expect(resolveExecutableBin("local-cast", DEFAULT_CAST_BIN, tmpDir)).toBe(
      binPath,
    );
  });

  test("returns false for non-executable file", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "foundry-exec-"));
    const binPath = path.join(tmpDir, "local-forge");
    fs.writeFileSync(binPath, "#!/bin/sh\nexit 0\n", { mode: 0o644 });
    expect(
      resolveExecutableBin("local-forge", DEFAULT_FORGE_BIN, tmpDir),
    ).toBe(false);
  });
});
