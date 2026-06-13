import type { Out } from "@univocity-tools/cli-kit/reporting";
import { runProcess } from "@univocity-tools/subprocess/run-process";
import type { AuthKind } from "./auth-kind.js";

/** Resolve a GitHub API token for the given auth kind. */
export async function resolveGithubToken(
  out: Out,
  authKind: AuthKind,
): Promise<string> {
  switch (authKind) {
    case "gh-cli":
      return resolveGhCliToken(out);
    case "env":
      return resolveEnvToken();
  }
}

async function resolveGhCliToken(out: Out): Promise<string> {
  const result = await runProcess(["gh", "auth", "token"]);
  if (result.exitCode !== 0) {
    const detail =
      result.stderr.trim() || result.stdout.trim() || "gh auth token failed";
    throw new Error(`gh auth token failed (${result.exitCode}): ${detail}`);
  }
  const token = result.stdout.trim();
  if (token.length === 0) {
    throw new Error("gh auth token returned an empty token");
  }
  out.log("resolved GitHub token via gh auth token");
  return token;
}

function resolveEnvToken(): string {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token === undefined || token.trim().length === 0) {
    throw new Error(
      "GITHUB_TOKEN or GH_TOKEN is required when --auth-kind env",
    );
  }
  return token.trim();
}
