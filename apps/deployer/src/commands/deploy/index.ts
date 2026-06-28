import { defineDeployerCommand } from "@univocity-tools/deployer-common";

export default defineDeployerCommand({
  meta: {
    name: "deploy",
    description: "Deploy Univocity contracts",
  },
  subCommands: {
    create3: () => import("./create3.js").then((m) => m.default),
    imutable: () => import("./imutable.js").then((m) => m.default),
    propose: () => import("./propose/index.js").then((m) => m.default),
    execute: () => import("./execute.js").then((m) => m.default),
    approve: () => import("./approve.js").then((m) => m.default),
    provision: () => import("./provision/index.js").then((m) => m.default),
  },
});
