import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseValidateBatchOptions } from "../options.js";
import {
  findGitRepoRootNamed,
  resolveContractsCheckoutRootEager,
} from "../contracts-checkout-root.js";

function withTempRepo(
  name: string,
  run: (repoRoot: string, nestedDir: string) => void,
): void {
  const base = mkdtempSync(path.join(tmpdir(), "univocity-tools-"));
  const repoRoot = path.join(base, name);
  const nestedDir = path.join(repoRoot, "script");
  mkdirSync(nestedDir, { recursive: true });
  writeFileSync(path.join(repoRoot, ".git"), "fixture\n");
  try {
    run(repoRoot, nestedDir);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

describe("parseValidateBatchOptions", () => {
  test("maps citty args to ValidateBatchOptions with absolute paths", () => {
    const options = parseValidateBatchOptions({
      _: ["./batch.json"],
      path: "./batch.json",
      verbose: true,
      "univocity-root": "/tmp/univocity",
    });

    expect(options).toEqual({
      verbose: true,
      univocityRoot: path.resolve(process.cwd(), "/tmp/univocity"),
      forgeConfig: path.resolve(
        path.resolve(process.cwd(), "/tmp/univocity"),
        "foundry.toml",
      ),
      path: "./batch.json",
    });
  });

  test("resolves relative forge-config under univocity root", () => {
    const options = parseValidateBatchOptions({
      _: ["./batch.json"],
      path: "./batch.json",
      "univocity-root": "/tmp/univocity",
      "forge-config": "script/create3-factory/foundry.toml",
    });

    expect(options.forgeConfig).toBe(
      path.resolve("/tmp/univocity", "script/create3-factory/foundry.toml"),
    );
  });
});

describe("resolveContractsCheckoutRootEager", () => {
  test("resolves explicit univocity-root against cwd", () => {
    expect(
      resolveContractsCheckoutRootEager({ "univocity-root": "../univocity" }),
    ).toBe(path.resolve(process.cwd(), "../univocity"));
  });
});

describe("findGitRepoRootNamed", () => {
  test("finds repo when cwd is inside a directory named univocity", () => {
    withTempRepo("univocity", (repoRoot, nestedDir) => {
      expect(findGitRepoRootNamed("univocity", nestedDir)).toBe(
        path.resolve(repoRoot),
      );
    });
  });

  test("returns undefined for a differently named repo", () => {
    withTempRepo("univocity-tools", (repoRoot, nestedDir) => {
      expect(findGitRepoRootNamed("univocity", nestedDir)).toBeUndefined();
      void repoRoot;
    });
  });
});
