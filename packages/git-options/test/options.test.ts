import { describe, expect, test } from "bun:test";
import {
  DEFAULT_AUTH_KIND,
  DEFAULT_GITHUB_ORG,
  DEFAULT_GITHUB_REPO,
  DEFAULT_WORKFLOW,
  normalizeAuthKind,
  parseGitOptions,
} from "../options.js";

describe("normalizeAuthKind", () => {
  test("defaults to gh-cli", () => {
    expect(normalizeAuthKind(undefined)).toBe(DEFAULT_AUTH_KIND);
  });

  test("accepts env", () => {
    expect(normalizeAuthKind("env")).toBe("env");
  });

  test("rejects unknown values", () => {
    expect(() => normalizeAuthKind("token")).toThrow(/invalid --auth-kind/);
  });
});

describe("parseGitOptions", () => {
  test("uses defaults", () => {
    expect(parseGitOptions({})).toEqual({
      org: DEFAULT_GITHUB_ORG,
      repo: DEFAULT_GITHUB_REPO,
      workflow: DEFAULT_WORKFLOW,
      authKind: DEFAULT_AUTH_KIND,
    });
  });

  test("reads kebab auth-kind", () => {
    expect(parseGitOptions({ "auth-kind": "env" })).toEqual({
      org: DEFAULT_GITHUB_ORG,
      repo: DEFAULT_GITHUB_REPO,
      workflow: DEFAULT_WORKFLOW,
      authKind: "env",
    });
  });

  test("reads camelCase authKind", () => {
    expect(parseGitOptions({ authKind: "env" })).toEqual({
      org: DEFAULT_GITHUB_ORG,
      repo: DEFAULT_GITHUB_REPO,
      workflow: DEFAULT_WORKFLOW,
      authKind: "env",
    });
  });

  test("reads org, repo, and workflow overrides", () => {
    expect(
      parseGitOptions({
        org: "acme",
        repo: "contracts",
        workflow: "ci.yml",
      }),
    ).toEqual({
      org: "acme",
      repo: "contracts",
      workflow: "ci.yml",
      authKind: DEFAULT_AUTH_KIND,
    });
  });
});
