#!/usr/bin/env bun
/**
 * Fail if server-only secret names appear in the deploy-web production bundle.
 * See docs/agents/deploy-web.md.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const DIST = resolve(
  new URL("..", import.meta.url).pathname,
  "apps/deploy-web/dist",
);

const FORBIDDEN = [
  "TESTING_PRIVY_APP_SECRET",
  "PRIVY_APP_SECRET",
  "DEPLOY_KEY",
  "MANDATE_SIGNER_TOKEN",
  "COORDINATOR_APP_TOKEN",
  "LINEAR_API_KEY",
];

if (!existsSync(DIST)) {
  console.error(
    "deploy-web dist missing; run: bun run --filter @univocity-tools/deploy-web build",
  );
  process.exit(1);
}

const violations: string[] = [];

function walk(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.(js|css|html|json|map)$/.test(entry.name)) {
      continue;
    }
    const text = readFileSync(path, "utf8");
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) {
        violations.push(`${needle} in ${path}`);
      }
    }
  }
}

walk(DIST);

if (violations.length > 0) {
  console.error("Client bundle secret audit failed:\n");
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  process.exit(1);
}

console.log("Client bundle secret audit passed.");
