import { defineDeployerCommand } from "@univocity-tools/deployer-common";

export default defineDeployerCommand({
  meta: {
    name: "config",
    description: "Inspect resolved deployment configuration",
  },
  subCommands: {
    show: () => import("./config/show.js").then((m) => m.default),
  },
});
