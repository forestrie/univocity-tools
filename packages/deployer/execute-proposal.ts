import type { Out } from "@univocity-tools/cli-kit/reporting";
import { getAddress, type Address, type Hex } from "viem";
import type { ExecuteProposalOptions } from "./options.js";
import {
  parseProposal,
  serializeProposal,
  type Proposal,
  type ProposalTransaction,
} from "./proposal.js";
import { createRpcClients } from "./rpc-client.js";

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

function assertReceiptSuccess(status: string): void {
  if (status !== "success") {
    throw new Error("transaction failed");
  }
}

async function broadcast(
  out: Out,
  options: ExecuteProposalOptions,
  rpcUrl: string,
  proposal: Proposal,
): Promise<Address | undefined> {
  const { publicClient, walletClient, account } = createRpcClients(
    rpcUrl,
    options.signer.key,
  );

  let deployed: Address | undefined;
  for (let i = 0; i < proposal.transactions.length; i++) {
    const tx = proposal.transactions[i] as ProposalTransaction;
    if (tx.operation !== 0) {
      throw new Error(
        "execute can only broadcast CALL transactions (operation 0); " +
          "operation 1 (delegatecall) must go through a Safe",
      );
    }

    out.print(
      "Broadcasting tx %d/%d (%s)...",
      i + 1,
      proposal.transactions.length,
      tx.to === null ? "contract-create" : tx.to,
    );

    const value = BigInt(tx.value);
    let hash: Hex;

    if (tx.to === null) {
      hash = await walletClient.sendTransaction({
        account,
        chain: null,
        data: tx.data,
        value,
      });
    } else {
      hash = await walletClient.sendTransaction({
        account,
        chain: null,
        to: tx.to,
        data: tx.data,
        value,
      });
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    assertReceiptSuccess(receipt.status);

    if (tx.to === null && receipt.contractAddress != null) {
      deployed = getAddress(receipt.contractAddress);
      out.out("ImutableUnivocity deployed at: %s", deployed);
    } else {
      out.print("  tx: %s", hash);
    }
  }
  return deployed;
}

async function persistDeployedAddress(
  out: Out,
  options: ExecuteProposalOptions,
  proposal: Proposal,
  deployed: Address,
): Promise<void> {
  if (options.proposalFile === undefined) {
    return;
  }
  const updated: Proposal = { ...proposal, imutableUnivocity: deployed };
  await Bun.write(options.proposalFile, `${serializeProposal(updated)}\n`);
  out.print("Updated proposal imutableUnivocity to %s", deployed);
}

/** Execute a deploy proposal locally (EOA broadcast via viem). */
export async function runExecuteProposal(
  out: Out,
  options: ExecuteProposalOptions,
): Promise<void> {
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

  const deployed = await broadcast(out, options, options.rpcUrl, proposal);
  if (deployed !== undefined) {
    await persistDeployedAddress(out, options, proposal, deployed);
  }
}
