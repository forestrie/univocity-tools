#!/usr/bin/env bun
import path from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { validateCreate3Config } from "../packages/create3-options/create3-config.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = path.join(ROOT, "create3.jsonc");
const OUT = path.join(ROOT, "packages/create3-options/src/defaults.ts");

const raw = await Bun.file(SRC).text();
const parsed: unknown = parseJsonc(raw);
const config = validateCreate3Config(parsed);

const body =
  "// GENERATED from create3.jsonc — do not edit.\n" +
  `export const CREATE3_DEFAULTS = ${JSON.stringify(config, null, 2)} as const;\n`;

await Bun.write(OUT, body);
console.log(`Wrote ${path.relative(ROOT, OUT)}`);
