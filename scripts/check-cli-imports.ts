#!/usr/bin/env bun
/**
 * CI guard: apps/ CLIs must use citty — see docs/agents/cli.md.
 */
import { Glob } from "bun";
import { relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const FORBIDDEN_CLI =
  /from\s+["'](?:commander|yargs|clipanion|cac|sade|meow|@effect\/cli)["']/;

const glob = new Glob("apps/**/src/cli.ts");
const violations: string[] = [];

for await (const path of glob.scan({ cwd: ROOT, absolute: true })) {
  const text = await Bun.file(path).text();
  const rel = relative(ROOT, path);
  if (FORBIDDEN_CLI.test(text)) {
    violations.push(`${rel}: forbidden CLI framework import`);
  }
  if (!/from\s+["']citty["']/.test(text)) {
    violations.push(`${rel}: must import from "citty" (e.g. runMain)`);
  }
  if (!/\brunMain\b/.test(text)) {
    violations.push(`${rel}: cli entry must call runMain`);
  }
}

if (violations.length > 0) {
  console.error("CLI policy violations:\n");
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  console.error("\nSee docs/agents/cli.md — use citty in apps/.");
  process.exit(1);
}

console.log("CLI import check passed.");
