import pkg from "../package.json";
import { defineCartCommand } from "@univocity-tools/contract-artefacts-common";

export const VERSION: string = pkg.version;

export default defineCartCommand({
  meta: {
    name: "contract-artefacts",
    version: VERSION,
    description:
      "CLI for Univocity contract artefact packaging and validation",
  },
  subCommands: {
    archive: () => import("./commands/archive.js").then((m) => m.default),
    "archive-extract": () =>
      import("./commands/archive-extract.js").then((m) => m.default),
    "release-id": () =>
      import("./commands/release-id.js").then((m) => m.default),
    validate: () => import("./commands/validate.js").then((m) => m.default),
  },
});
