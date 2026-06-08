import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runExecuteProposal } from "@univocity-tools/deployer-common/main";
import { parseExecuteProposalOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "execute",
    description:
      "Execute a deploy proposal locally by broadcasting its transactions " +
      "(EOA via cast send). Reads a proposal file or stdin.",
  },
  args: withDeployerArgs({
    proposalFile: {
      type: "positional",
      description: "Proposal JSON file (omit to read from stdin)",
      required: false,
    },
  }),
  run: defineCommandRunner(parseExecuteProposalOptions, runExecuteProposal),
});
