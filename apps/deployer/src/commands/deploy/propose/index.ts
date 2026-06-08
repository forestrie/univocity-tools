import { defineDeployerCommand } from "@univocity-tools/deployer-common";

export default defineDeployerCommand({
  meta: {
    name: "propose",
    description: "Build deploy proposals (propose then execute)",
  },
  subCommands: {
    imutable: () => import("./imutable.js").then((m) => m.default),
  },
});
