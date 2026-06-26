import type { Out } from "@univocity-tools/cli-kit/reporting";
import type { Hex } from "viem";
import type { ApproveProposalOptions } from "./options.js";
import {
  parseProposal,
  type Proposal,
  type ProposalTransaction,
} from "./proposal.js";
import { hasBytecodeAt } from "./rpc-client.js";
import {
  approveSafeTransaction,
  buildSafeTxFields,
  safeDashboardUrl,
  type SafeTxFields,
} from "./safe-client.js";
import { createPublicClient, http } from "viem";

async function readProposalSource(
  options: ApproveProposalOptions,
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

function resolveSafeTxHash(
  options: ApproveProposalOptions,
  proposal: Proposal,
): Hex {
  if (options.safeTxHash !== undefined) {
    return options.safeTxHash;
  }
  const hash = proposal.safe?.safeTxHash;
  if (hash === undefined) {
    throw new Error(
      "safe proposals require safe.safeTxHash or --safe-tx-hash",
    );
  }
  return hash;
}

function safeTxFieldsFromProposal(proposal: Proposal): SafeTxFields {
  const safe = proposal.safe;
  if (safe === undefined) {
    throw new Error("safe proposals require a safe block");
  }
  const tx = proposal.transactions[0] as ProposalTransaction | undefined;
  if (tx === undefined || tx.to === null) {
    throw new Error(
      "safe proposals require a CALL transaction with a to address",
    );
  }
  return buildSafeTxFields({
    to: tx.to,
    data: tx.data,
    operation: tx.operation,
    nonce: BigInt(safe.nonce),
    value: BigInt(tx.value),
  });
}

async function assertContractDeployed(
  rpcUrl: string,
  address: string,
): Promise<void> {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const deployed = await hasBytecodeAt(client, address as `0x${string}`);
  if (!deployed) {
    throw new Error(`no contract code at ${address} after Safe execution`);
  }
}

/** Approve and optionally execute a Safe deploy-imutable proposal. */
export async function runApproveProposal(
  out: Out,
  options: ApproveProposalOptions,
): Promise<void> {
  const proposal = parseProposal(await readProposalSource(options));
  if (proposal.publishMode !== "safe") {
    throw new Error(
      "deploy approve only handles safe proposals; use deploy execute for eoa",
    );
  }

  const safe = proposal.from;
  const safeTxHash = resolveSafeTxHash(options, proposal);
  const expectedTx = safeTxFieldsFromProposal(proposal);

  out.print("Approving SafeTx %s for Safe %s...", safeTxHash, safe);
  out.print("Dashboard: %s", safeDashboardUrl(safe, safeTxHash));

  const result = await approveSafeTransaction({
    rpcUrl: options.rpcUrl,
    serviceUrl: options.safeTxServiceUrl,
    safe,
    chainId: proposal.chainId,
    safeTxHash,
    expectedTx,
    signerKey: options.signer.key,
    signerAddress: options.signer.address,
    confirmOnly: options.confirmOnly,
  });

  if (options.confirmOnly) {
    out.out("Posted confirmation for SafeTx %s", safeTxHash);
    return;
  }

  if (result.executionTxHash !== undefined) {
    out.out("Safe execution tx: %s", result.executionTxHash);
  }

  const target = proposal.imutableUnivocity;
  if (target !== null) {
    await assertContractDeployed(options.rpcUrl, target);
    out.out("ImutableUnivocity deployed at: %s", target);
  }
}
