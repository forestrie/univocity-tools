import pkg from "../package.json";
import { defineDeployerCommand } from "@univocity-tools/deployer-common";

export const VERSION: string = pkg.version;

export default defineDeployerCommand({
  meta: {
    name: "deployer",
    version: VERSION,
    description: "CLI for Univocity contract deployment",
  },
  subCommands: {
    config: () => import("./commands/config.js").then((m) => m.default),
    deploy: () => import("./commands/deploy/index.js").then((m) => m.default),
  },
});
