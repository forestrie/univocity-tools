import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findGitRepoRootNamed } from "../src/find-git-repo-root.js";
import { resolveSourceGitRootEager } from "../src/source-git-root.js";
import { resolveWorkDir } from "../src/work-dir.js";
import { parseCommonOptions } from "../src/common-options.js";

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

describe("resolveSourceGitRootEager", () => {
  test("resolves explicit source-root against cwd", () => {
    expect(resolveSourceGitRootEager({ "source-root": "../univocity" })).toBe(
      path.resolve(process.cwd(), "../univocity"),
    );
  });

  test("resolves ${env} from SOURCE_ROOT", () => {
    const prev = process.env.SOURCE_ROOT;
    process.env.SOURCE_ROOT = "../univocity";
    try {
      expect(resolveSourceGitRootEager({ "source-root": "${env}" })).toBe(
        path.resolve(process.cwd(), "../univocity"),
      );
    } finally {
      if (prev === undefined) {
        delete process.env.SOURCE_ROOT;
      } else {
        process.env.SOURCE_ROOT = prev;
      }
    }
  });

  test("discovers git repo when gitRepoName matches cwd ancestry", () => {
    withTempRepo("univocity", (repoRoot, nestedDir) => {
      const prev = process.cwd();
      process.chdir(nestedDir);
      try {
        expect(
          resolveSourceGitRootEager({}, { gitRepoName: "univocity" }),
        ).toBe(findGitRepoRootNamed("univocity", process.cwd()));
      } finally {
        process.chdir(prev);
      }
    });
  });

  test("falls back to cwd when unset and no gitRepoName", () => {
    expect(resolveSourceGitRootEager({})).toBe(path.resolve(process.cwd()));
  });
});

describe("resolveWorkDir", () => {
  const ROOT = "/tmp/source";

  test("defaults to .work under the source root", () => {
    expect(resolveWorkDir({}, ROOT)).toBe(path.resolve(ROOT, ".work"));
  });

  test("resolves a relative override under the source root", () => {
    expect(resolveWorkDir({ "work-dir": "build-out" }, ROOT)).toBe(
      path.resolve(ROOT, "build-out"),
    );
  });

  test("absolute work dir unchanged", () => {
    expect(resolveWorkDir({ workDir: "/var/work" }, ROOT)).toBe("/var/work");
  });

  test("resolves ${env} from WORK_DIR", () => {
    const prev = process.env.WORK_DIR;
    process.env.WORK_DIR = "ci-work";
    try {
      expect(resolveWorkDir({ "work-dir": "${env}" }, ROOT)).toBe(
        path.resolve(ROOT, "ci-work"),
      );
    } finally {
      if (prev === undefined) {
        delete process.env.WORK_DIR;
      } else {
        process.env.WORK_DIR = prev;
      }
    }
  });
});

describe("parseCommonOptions", () => {
  test("resolves source root and work dir together", () => {
    const options = parseCommonOptions({ "source-root": "/tmp/univocity" });
    const sourceRoot = path.resolve(process.cwd(), "/tmp/univocity");
    expect(options).toEqual({
      sourceRoot,
      workDir: path.resolve(sourceRoot, ".work"),
    });
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
