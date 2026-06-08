#!/usr/bin/env bun
/**
 * CI guard: apps/ and packages/ must not import Node child_process.
 * Subprocesses use Bun.spawn — see docs/agents/subprocess.md.
 */
import { Glob } from "bun";
import { relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CHILD_PROCESS =
  /(?:from\s+["']node:child_process["']|from\s+["']child_process["']|require\s*\(\s*["']child_process["']\s*\))/;

const globs = ["apps/**/*.ts", "packages/**/*.ts"];
const violations: string[] = [];

for (const pattern of globs) {
  const glob = new Glob(pattern);
  for await (const path of glob.scan({ cwd: ROOT, absolute: true })) {
    const text = await Bun.file(path).text();
    const rel = relative(ROOT, path);
    if (CHILD_PROCESS.test(text)) {
      violations.push(`${rel}: Node child_process import`);
    }
    if (/\$\s*`/.test(text) && /from\s+["']bun["']/.test(text)) {
      violations.push(`${rel}: Bun $ shell subprocess (use Bun.spawn)`);
    }
  }
}

if (violations.length > 0) {
  console.error("Subprocess policy violations:\n");
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  console.error("\nSee docs/agents/subprocess.md — use Bun.spawn only.");
  process.exit(1);
}

console.log("Subprocess import check passed.");
