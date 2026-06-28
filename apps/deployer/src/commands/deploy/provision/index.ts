import { defineDeployerCommand } from "@univocity-tools/deployer-common";

export default defineDeployerCommand({
  meta: {
    name: "provision",
    description: "Ephemeral cross-stack e2e Univocity provisioning",
  },
  subCommands: {
    e2e: () => import("./e2e.js").then((m) => m.default),
  },
});
