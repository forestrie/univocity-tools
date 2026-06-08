import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  requireCastBin,
  requireForgeBin,
  toFoundryExecContext,
  type FoundryExecContext,
} from "@univocity-tools/foundry-exec/require-bins";
import { runCast } from "@univocity-tools/foundry-exec/spawn";
import type { ExecuteProposalOptions } from "./options.js";
import {
  parseProposal,
  type Proposal,
  type ProposalTransaction,
} from "./proposal.js";

async function readProposalSource(
  options: ExecuteProposalOptions,
): Promise<string> {
  if (options.proposalFile !== undefined) {
    return Bun.file(options.proposalFile).text();
  }
  const stdin = await Bun.stdin.text();
  if (stdin.trim().length === 0) {
    throw new Error(
      "no proposal provided: pass a proposal file or pipe one on stdin",
    );
  }
  return stdin;
}

function castSendArgs(
  options: ExecuteProposalOptions,
  rpcUrl: string,
  tx: ProposalTransaction,
): string[] {
  if (tx.operation !== 0) {
    throw new Error(
      "execute can only broadcast CALL transactions (operation 0); " +
        "operation 1 (delegatecall) must go through a Safe",
    );
  }
  const wallet = [
    "--private-key",
    options.signer.key,
    "--rpc-url",
    rpcUrl,
    "--json",
  ];
  if (tx.to === null) {
    // cast send --create: wallet flags must precede --create (Foundry 1.5+).
    return ["send", ...wallet, "--create", tx.data];
  }
  const value = tx.value && tx.value !== "0" ? ["--value", tx.value] : [];
  return ["send", tx.to, tx.data, ...value, ...wallet];
}

function parseReceipt(stdout: string): {
  contractAddress?: string;
  status?: unknown;
  transactionHash?: string;
} {
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (parsed !== null && typeof parsed === "object") {
      return parsed as Record<string, never>;
    }
  } catch {
    /* fall through */
  }
  return {};
}

function assertReceiptSuccess(stdout: string): void {
  const receipt = parseReceipt(stdout);
  const status = receipt.status;
  if (
    status !== undefined &&
    status !== "0x1" &&
    status !== 1 &&
    status !== "1" &&
    status !== "success"
  ) {
    throw new Error(`transaction failed: ${stdout}`);
  }
}

async function broadcast(
  ctx: FoundryExecContext,
  out: Out,
  options: ExecuteProposalOptions,
  rpcUrl: string,
  proposal: Proposal,
): Promise<void> {
  for (let i = 0; i < proposal.transactions.length; i++) {
    const tx = proposal.transactions[i] as ProposalTransaction;
    out.print(
      "Broadcasting tx %d/%d (%s)...",
      i + 1,
      proposal.transactions.length,
      tx.to === null ? "contract-create" : tx.to,
    );
    const { stdout } = await runCast(ctx, castSendArgs(options, rpcUrl, tx));
    assertReceiptSuccess(stdout);
    const receipt = parseReceipt(stdout);
    if (tx.to === null && typeof receipt.contractAddress === "string") {
      out.out("ImutableUnivocity deployed at: %s", receipt.contractAddress);
    } else if (typeof receipt.transactionHash === "string") {
      out.print("  tx: %s", receipt.transactionHash);
    }
  }
}

/** Execute a deploy proposal locally (EOA broadcast via cast send). */
export async function runExecuteProposal(
  out: Out,
  options: ExecuteProposalOptions,
): Promise<void> {
  requireForgeBin(options);
  requireCastBin(options);

  const proposal = parseProposal(await readProposalSource(options));

  if (proposal.publishMode === "safe") {
    throw new Error(
      "this is a Safe proposal; execute it via the Safe Transaction Service " +
        "/ Safe web UI, not deploy execute",
    );
  }

  if (options.signer.address.toLowerCase() !== proposal.from.toLowerCase()) {
    throw new Error(
      `signer ${options.signer.address} does not match proposal from ` +
        `${proposal.from}; supply the matching --owner-signer / --deploy-key`,
    );
  }

  if (options.rpcUrl === undefined) {
    throw new Error("execute requires --rpc-url (or RPC_URL)");
  }

  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    out,
    cwd: options.univocityRoot,
  });

  await broadcast(ctx, out, options, options.rpcUrl, proposal);
}
