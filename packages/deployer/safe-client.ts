import {
  createPublicClient,
  hashTypedData,
  http,
  type Address,
  type Hex,
  type TypedDataDomain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const NULL_ADDRESS: Address =
  "0x0000000000000000000000000000000000000000";

/** EIP-712 SafeTx struct (Safe contracts >= 1.3.0). */
export const SAFE_TX_TYPES = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

const SAFE_NONCE_ABI = [
  {
    type: "function",
    name: "nonce",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

/** Full SafeTx parameter set (zero gas params for a Builder-style batch). */
export type SafeTxFields = {
  to: Address;
  value: bigint;
  data: Hex;
  operation: 0 | 1;
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: Address;
  refundReceiver: Address;
  nonce: bigint;
};

/** Build a SafeTx with Safe-Builder default (zero) gas parameters. */
export function buildSafeTxFields(input: {
  to: Address;
  data: Hex;
  operation: 0 | 1;
  nonce: bigint;
  value?: bigint;
}): SafeTxFields {
  return {
    to: input.to,
    value: input.value ?? 0n,
    data: input.data,
    operation: input.operation,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: NULL_ADDRESS,
    refundReceiver: NULL_ADDRESS,
    nonce: input.nonce,
  };
}

/** Safe >= 1.3.0 EIP-712 domain: only chainId + verifyingContract. */
export function safeTxDomain(chainId: number, safe: Address): TypedDataDomain {
  return { chainId, verifyingContract: safe };
}

/** Compute the Safe transaction hash (contractTransactionHash). */
export function computeSafeTxHash(
  chainId: number,
  safe: Address,
  tx: SafeTxFields,
): Hex {
  return hashTypedData({
    domain: safeTxDomain(chainId, safe),
    types: SAFE_TX_TYPES,
    primaryType: "SafeTx",
    message: {
      to: tx.to,
      value: tx.value,
      data: tx.data,
      operation: tx.operation,
      safeTxGas: tx.safeTxGas,
      baseGas: tx.baseGas,
      gasPrice: tx.gasPrice,
      gasToken: tx.gasToken,
      refundReceiver: tx.refundReceiver,
      nonce: tx.nonce,
    },
  });
}

/** Read the Safe's current nonce via an RPC public client. */
export async function fetchSafeNonce(
  rpcUrl: string,
  safe: Address,
): Promise<bigint> {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return client.readContract({
    address: safe,
    abi: SAFE_NONCE_ABI,
    functionName: "nonce",
  });
}

/** Sign a Safe transaction hash with the deploy key (EOA ECDSA, v in 27/28). */
export async function signSafeTxHash(
  deployKey: Hex,
  safeTxHash: Hex,
): Promise<Hex> {
  return privateKeyToAccount(deployKey).sign({ hash: safeTxHash });
}

export type PostSafeTransactionInput = {
  serviceUrl: string;
  chainId: number;
  safe: Address;
  tx: SafeTxFields;
  safeTxHash: Hex;
  sender: Address;
  signature: Hex;
  origin?: string;
};

/** POST a signed SafeTx to the Safe Transaction Service. */
export async function postSafeTransaction(
  input: PostSafeTransactionInput,
): Promise<void> {
  const base = input.serviceUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/safes/${input.safe}/multisig-transactions/`;
  const body = {
    to: input.tx.to,
    value: input.tx.value.toString(),
    data: input.tx.data,
    operation: input.tx.operation,
    safeTxGas: input.tx.safeTxGas.toString(),
    baseGas: input.tx.baseGas.toString(),
    gasPrice: input.tx.gasPrice.toString(),
    gasToken: input.tx.gasToken,
    refundReceiver: input.tx.refundReceiver,
    nonce: input.tx.nonce.toString(),
    contractTransactionHash: input.safeTxHash,
    sender: input.sender,
    signature: input.signature,
    origin: input.origin ?? "univocity-tools deployer",
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Safe Transaction Service rejected proposal (${response.status}): ` +
        `${detail || response.statusText}`,
    );
  }
}

/** Safe web UI deep link for a proposed transaction (Base Sepolia prefix). */
export function safeDashboardUrl(safe: Address, safeTxHash: Hex): string {
  return (
    "https://app.safe.global/transactions/tx?" +
    `safe=basesep:${safe}&id=multisig_${safe}_${safeTxHash}`
  );
}
