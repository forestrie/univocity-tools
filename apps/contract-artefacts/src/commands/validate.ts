import { defineCartCommand } from "@univocity-tools/contract-artefacts-common";

export default defineCartCommand({
  meta: {
    name: "validate",
    description: "Validate Univocity deploy and build artifacts",
  },
  subCommands: {
    batch: () => import("./validate/batch.js").then((m) => m.default),
  },
});
