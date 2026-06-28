#!/usr/bin/env bun
/**
 * CI guard: packages/deploy-core must stay browser-safe (no Node/Bun/Buffer).
 * See docs/adr/adr-0011-browser-safe-deploy-core.md.
 */
import { Glob } from "bun";
import { relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TARGET = "packages/deploy-core";

const FORBIDDEN: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /from\s+["']node:/, label: "node: import" },
  { pattern: /from\s+["']bun["']/, label: "bun import" },
  { pattern: /\bBuffer\b/, label: "Buffer usage" },
  { pattern: /from\s+["']node:fs/, label: "node:fs import" },
  { pattern: /from\s+["']fs["']/, label: "fs import" },
];

const violations: string[] = [];
const glob = new Glob("**/*.ts");

for await (const path of glob.scan({
  cwd: `${ROOT}/${TARGET}`,
  absolute: true,
})) {
  const rel = relative(ROOT, path);
  if (rel.includes("/test/")) {
    continue;
  }
  const text = await Bun.file(path).text();
  for (const { pattern, label } of FORBIDDEN) {
    if (pattern.test(text)) {
      violations.push(`${rel}: ${label}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Browser-safe policy violations in deploy-core:\n");
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  console.error(
    "\nSee docs/adr/adr-0011-browser-safe-deploy-core.md — viem + WebCrypto only.",
  );
  process.exit(1);
}

console.log("Browser-safe import check passed.");
