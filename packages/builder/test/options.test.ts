import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findGitRepoRootNamed } from "@univocity-tools/cli-kit";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import { parseValidateBatchOptions } from "../options.js";
import { resolveContractsCheckoutRootEager } from "../contracts-checkout-root.js";

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

    const univocityRoot = path.resolve(process.cwd(), "/tmp/univocity");
    expect(options).toEqual({
      verbose: true,
      univocityRoot,
      forgeConfig: path.resolve(univocityRoot, "foundry.toml"),
      outDir: path.resolve(univocityRoot, "out"),
      path: "./batch.json",
      ...parseFoundryBinOptions({}),
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
    expect(options.outDir).toBe(
      path.resolve("/tmp/univocity", "script/create3-factory/out"),
    );
  });
});

describe("resolveContractsCheckoutRootEager", () => {
  test("resolves explicit univocity-root against cwd", () => {
    expect(
      resolveContractsCheckoutRootEager({ "univocity-root": "../univocity" }),
    ).toBe(path.resolve(process.cwd(), "../univocity"));
  });

  test("resolves ${env} from UNIVOCITY_ROOT", () => {
    const prev = process.env.UNIVOCITY_ROOT;
    process.env.UNIVOCITY_ROOT = "../univocity";
    try {
      expect(
        resolveContractsCheckoutRootEager({ "univocity-root": "${env}" }),
      ).toBe(path.resolve(process.cwd(), "../univocity"));
    } finally {
      if (prev === undefined) {
        delete process.env.UNIVOCITY_ROOT;
      } else {
        process.env.UNIVOCITY_ROOT = prev;
      }
    }
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
