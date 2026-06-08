import {
  defineDeployerCommand,
  defineCommandRunner,
  withDeployerArgs,
} from "@univocity-tools/deployer-common";
import { runApproveProposal } from "@univocity-tools/deployer-common/main";
import { parseApproveProposalOptions } from "@univocity-tools/deployer-common/options";

export default defineDeployerCommand({
  meta: {
    name: "approve",
    description:
      "Sign and execute a Safe deploy-imutable proposal via the " +
      "Transaction Service (default: sign + on-chain execute)",
  },
  args: withDeployerArgs({
    proposalFile: {
      type: "positional",
      description: "Proposal JSON file (omit to read from stdin)",
      required: false,
    },
    "safe-tx-hash": {
      type: "string",
      description:
        "Override the SafeTx hash (default: proposal.safe.safeTxHash; " +
        "env: SAFE_TX_HASH)",
      valueHint: "hex",
    },
    "safe-tx-service-url": {
      type: "string",
      description:
        "Safe Transaction Service base URL (env: SAFE_TX_SERVICE_URL)",
      valueHint: "url",
    },
    "confirm-only": {
      type: "boolean",
      description:
        "Post the owner confirmation only; do not execute on-chain",
      default: false,
    },
  }),
  run: defineCommandRunner(parseApproveProposalOptions, runApproveProposal),
});
