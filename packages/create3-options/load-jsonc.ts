import { readFileSync } from "node:fs";
import { parse as parseJsonc } from "jsonc-parser";
import {
  validateCreate3Config,
  type Create3Config,
} from "./create3-config.js";

export function parseJsoncFileSync(filePath: string): Create3Config {
  const raw = readFileSync(filePath, "utf8");
  const parsed: unknown = parseJsonc(raw);
  return validateCreate3Config(parsed);
}
