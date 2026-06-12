import { describe, expect, test } from "bun:test";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  bumpVersion,
  formatBuildDate,
  formatBuildId,
  formatReleaseId,
  formatVersion,
  parseSemverTag,
  resolveReleaseId,
  selectBaseVersion,
} from "../release-id.js";

const haveGit = Bun.which("git") !== null;

function git(cwd: string, ...args: string[]): void {
  const proc = Bun.spawnSync(["git", "-C", cwd, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (proc.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${proc.stderr.toString()}`);
  }
}

function initRepo(): string {
  const root = mkdtempSync(path.join(tmpdir(), "release-id-"));
  git(root, "init", "-q");
  git(
    root,
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "init",
  );
  return root;
}

describe("parseSemverTag", () => {
  test("parses v-prefixed and bare semver tags", () => {
    expect(parseSemverTag("v0.1.1")).toEqual({
      prefix: "v",
      major: 0,
      minor: 1,
      patch: 1,
    });
    expect(parseSemverTag("1.2.3")).toEqual({
      prefix: "",
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  test("rejects non-semver and partial tags", () => {
    expect(parseSemverTag("nightly")).toBeUndefined();
    expect(parseSemverTag("v1.2")).toBeUndefined();
    expect(parseSemverTag("v1.2.3-rc1")).toBeUndefined();
  });
});

describe("selectBaseVersion", () => {
  test("returns the first semver-shaped tag", () => {
    expect(selectBaseVersion(["nightly", "v0.3.0", "v0.2.0"])).toEqual({
      prefix: "v",
      major: 0,
      minor: 3,
      patch: 0,
    });
  });

  test("falls back to v0.0.0 when no semver tag exists", () => {
    expect(selectBaseVersion([])).toEqual({
      prefix: "v",
      major: 0,
      minor: 0,
      patch: 0,
    });
    expect(selectBaseVersion(["foo", "bar"])).toEqual({
      prefix: "v",
      major: 0,
      minor: 0,
      patch: 0,
    });
  });
});

describe("bumpVersion", () => {
  const base = { prefix: "v", major: 0, minor: 1, patch: 1 };

  test("major resets minor and patch", () => {
    expect(formatVersion(bumpVersion(base, "major"))).toBe("v1.0.0");
  });

  test("minor resets patch", () => {
    expect(formatVersion(bumpVersion(base, "minor"))).toBe("v0.2.0");
  });

  test("patch increments only patch", () => {
    expect(formatVersion(bumpVersion(base, "patch"))).toBe("v0.1.2");
  });

  test("preserves an empty prefix", () => {
    const bare = { prefix: "", major: 1, minor: 2, patch: 3 };
    expect(formatVersion(bumpVersion(bare, "minor"))).toBe("1.3.0");
  });
});

describe("build id formatting", () => {
  test("formatBuildDate renders two-digit UTC YYMMDD", () => {
    expect(formatBuildDate(new Date(Date.UTC(2026, 5, 12)))).toBe("260612");
  });

  test("formatBuildId and formatReleaseId compose the parts", () => {
    const buildId = formatBuildId(new Date(Date.UTC(2026, 5, 12)), "0594a39e");
    expect(buildId).toBe("260612-0594a39e");
    expect(formatReleaseId("v0.1.1", buildId)).toBe("v0.1.1+260612-0594a39e");
  });
});

describe.skipIf(!haveGit)("resolveReleaseId", () => {
  test("derives version+build-id from the most recent semver tag", async () => {
    const root = initRepo();
    try {
      git(root, "tag", "v0.1.1");
      const resolved = await resolveReleaseId(createNullOut(), {
        repoRoot: root,
      });
      expect(resolved.version).toBe("v0.1.1");
      expect(resolved.releaseId).toMatch(/^v0\.1\.1\+\d{6}-[0-9a-f]+$/);
      expect(resolved.buildId).toMatch(/^\d{6}-[0-9a-f]+$/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("semverOnly skips the build id", async () => {
    const root = initRepo();
    try {
      git(root, "tag", "v0.1.1");
      const resolved = await resolveReleaseId(createNullOut(), {
        repoRoot: root,
        semverOnly: true,
      });
      expect(resolved.version).toBe("v0.1.1");
      expect(resolved.releaseId).toBe("v0.1.1");
      expect(resolved.buildId).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("applies a bump to the base version", async () => {
    const root = initRepo();
    try {
      git(root, "tag", "v0.1.1");
      const resolved = await resolveReleaseId(createNullOut(), {
        repoRoot: root,
        bump: "minor",
      });
      expect(resolved.version).toBe("v0.2.0");
      expect(resolved.releaseId).toMatch(/^v0\.2\.0\+\d{6}-[0-9a-f]+$/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("falls back to v0.0.0 when the repo has no tags", async () => {
    const root = initRepo();
    try {
      const resolved = await resolveReleaseId(createNullOut(), {
        repoRoot: root,
      });
      expect(resolved.version).toBe("v0.0.0");
      expect(resolved.releaseId).toMatch(/^v0\.0\.0\+\d{6}-[0-9a-f]+$/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("throws when the path is not a git repository", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "release-id-nogit-"));
    try {
      await expect(
        resolveReleaseId(createNullOut(), { repoRoot: root }),
      ).rejects.toThrow(/is not a git repository/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
