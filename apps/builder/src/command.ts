import pkg from "../package.json";
import { defineBuilderCommand } from "@univocity-tools/builder-common";

export const VERSION: string = pkg.version;

export default defineBuilderCommand({
  meta: {
    name: "builder",
    version: VERSION,
    description: "CLI for Univocity contract build and deploy artifacts",
  },
  subCommands: {
    validate: () => import("./commands/validate.js").then((m) => m.default),
  },
});
