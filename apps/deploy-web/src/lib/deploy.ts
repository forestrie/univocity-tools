import {
  buildImutableDeploymentData,
  resolveBootstrapKey,
  type BootstrapAlg,
  type BootstrapKeyInput,
  type GenesisBinding,
  type ImutableBytecode,
} from "@univocity-tools/deploy-core";
import {
  createWalletClient,
  custom,
  type Address,
  type Hex,
  type WalletClient,
} from "viem";
import { baseSepolia } from "viem/chains";
import type { EthereumProvider } from "./privy.js";

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

function chainForId(chainId: number) {
  if (chainId === baseSepolia.id) {
    return baseSepolia;
  }
  return {
    ...baseSepolia,
    id: chainId,
    name: `chain-${chainId}`,
  };
}

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

export async function deployImutableContract(
  params: DeployParams,
): Promise<DeployResult> {
  const { deploymentData, bootstrapAlg } = await buildDeploymentTxData(
    params.artifact,
    params.bootstrap,
  );
  const chain = chainForId(params.chainId);
  const walletClient = createWalletClient({
    chain,
    transport: custom(params.provider),
  });
  const [account] = await walletClient.getAddresses();
  if (!account) {
    throw new Error("wallet has no account");
  }
  const hash = await walletClient.sendTransaction({
    account,
    chain,
    data: deploymentData,
    value: 0n,
  });
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

export function createWalletClientFromProvider(
  provider: EthereumProvider,
  chainId: number,
): WalletClient {
  return createWalletClient({
    chain: chainForId(chainId),
    transport: custom(provider),
  });
}
