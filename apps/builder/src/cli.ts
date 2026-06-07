#!/usr/bin/env bun
import { run } from "./index.js";

const code = run(process.argv.slice(2));
process.exit(code);
