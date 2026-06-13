import { mergeCommandArgs } from "@univocity-tools/cli-kit";
import type { ArgsDef } from "citty";

/** Citty flags for commands that target a GitHub org/repo/workflow. */
export const gitArgs = {
  org: {
    type: "string",
    description: "GitHub organization or user that owns the repository",
    valueHint: "name",
    default: "forestrie",
  },
  repo: {
    type: "string",
    description: "GitHub repository name",
    valueHint: "name",
    default: "univocity",
  },
  workflow: {
    type: "string",
    description: "Workflow file name (e.g. release.yml)",
    valueHint: "file",
    default: "release.yml",
  },
  "auth-kind": {
    type: "string",
    description:
      "How to obtain a GitHub API token: gh-cli (gh auth token) or env " +
      "(GITHUB_TOKEN / GH_TOKEN)",
    valueHint: "gh-cli|env",
    default: "gh-cli",
  },
} as const satisfies ArgsDef;

/** Merge git flags into a command-specific `args` object. */
export function withGitArgs<T extends ArgsDef>(args?: T): ArgsDef & T {
  return mergeCommandArgs(gitArgs, args) as ArgsDef & T;
}
