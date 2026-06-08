import { defineBuilderCommand } from "@univocity-tools/builder-common";

export default defineBuilderCommand({
  meta: {
    name: "validate",
    description: "Validate Univocity deploy and build artifacts",
  },
  subCommands: {
    batch: () => import("./validate/batch.js").then((m) => m.default),
  },
});
