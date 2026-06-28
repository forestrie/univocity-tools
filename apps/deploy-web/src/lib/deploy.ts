import {
  buildImutableDeploymentData,
  resolveBootstrapKey,
  type BootstrapAlg,
  type BootstrapKeyInput,
  type GenesisBinding,
  type ImutableBytecode,
} from "@univocity-tools/deploy-core";
import type { Address, Hex } from "viem";
import type { EthereumProvider } from "./privy.js";
import { ensureWalletChain } from "./wallet-chain.js";

export {
  assertWalletChainMatches,
  readWalletChainId,
} from "./wallet-chain.js";

export type DeployParams = {
  provider: EthereumProvider;
  chainId: number;
  rpcUrl: string;
  artifact: ImutableBytecode;
  bootstrap: BootstrapKeyInput;
};

export type DeployResult = {
  contractAddress: Address;
  deploymentData: Hex;
  genesis: GenesisBinding;
};

export async function buildDeploymentTxData(
  artifact: ImutableBytecode,
  bootstrap: BootstrapKeyInput,
): Promise<{ deploymentData: Hex; bootstrapAlg: BootstrapAlg }> {
  const resolved = await resolveBootstrapKey(bootstrap);
  const deploymentData = buildImutableDeploymentData(
    artifact.bytecode,
    resolved.algId,
    resolved.key,
  );
  return { deploymentData, bootstrapAlg: resolved.alg };
}

async function getDeployAccount(provider: EthereumProvider): Promise<Address> {
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  const account = accounts[0];
  if (account === undefined || account.length === 0) {
    throw new Error("wallet has no account");
  }
  return account as Address;
}

/** Send a contract-creation transaction via EIP-1193 (avoids viem Buffer usage). */
export async function sendContractCreationTx(
  provider: EthereumProvider,
  from: Address,
  chainId: number,
  data: Hex,
): Promise<Hex> {
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        data,
        value: "0x0",
        chainId: `0x${chainId.toString(16)}`,
      },
    ],
  });
  if (typeof hash !== "string" || !hash.startsWith("0x")) {
    throw new Error("wallet did not return a transaction hash");
  }
  return hash as Hex;
}

export async function deployImutableContract(
  params: DeployParams,
): Promise<DeployResult> {
  await ensureWalletChain(params.provider, params.chainId);
  const { deploymentData, bootstrapAlg } = await buildDeploymentTxData(
    params.artifact,
    params.bootstrap,
  );
  const account = await getDeployAccount(params.provider);
  const hash = await sendContractCreationTx(
    params.provider,
    account,
    params.chainId,
    deploymentData,
  );
  const receipt = await waitForReceipt(params.rpcUrl, hash);
  const contractAddress = receipt.contractAddress;
  if (!contractAddress) {
    throw new Error("deploy transaction succeeded but no contract address");
  }
  return {
    contractAddress,
    deploymentData,
    genesis: {
      chainId: params.chainId,
      univocityAddr: contractAddress,
      bootstrapAlg,
    },
  };
}

async function waitForReceipt(
  rpcUrl: string,
  hash: Hex,
): Promise<{ contractAddress: Address | null }> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getTransactionReceipt",
    params: [hash],
  };
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as {
      result?: { contractAddress: Address | null };
    };
    if (json.result) {
      return json.result;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("timed out waiting for deploy receipt");
}

export function downloadGenesisJson(genesis: GenesisBinding): void {
  const blob = new Blob([JSON.stringify(genesis, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "univocity-genesis.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
