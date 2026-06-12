import {
  concat,
  createPublicClient,
  createWalletClient,
  getAddress,
  hashTypedData,
  http,
  isHex,
  type Address,
  type Hex,
  type PublicClient,
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

const SAFE_OWNERS_ABI = [
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
] as const;

const SAFE_EXEC_ABI = [
  {
    type: "function",
    name: "execTransaction",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;

export type SafeConfirmation = {
  owner: Address;
  signature: Hex;
};

export type SafeServiceTransaction = {
  safe: Address;
  safeTxHash: Hex;
  tx: SafeTxFields;
  confirmations: SafeConfirmation[];
  confirmationsRequired: number;
  isExecuted: boolean;
  executionTxHash?: Hex | undefined;
};

function serviceBaseUrl(serviceUrl: string): string {
  return serviceUrl.replace(/\/$/, "");
}

function asServiceHex(value: unknown, label: string): Hex {
  if (typeof value !== "string" || !isHex(value)) {
    throw new Error(`Safe Transaction Service: ${label} must be hex`);
  }
  return value;
}

function asServiceAddress(value: unknown, label: string): Address {
  if (typeof value !== "string") {
    throw new Error(`Safe Transaction Service: ${label} must be an address`);
  }
  return getAddress(value);
}

function parseServiceTransaction(
  json: Record<string, unknown>,
): SafeServiceTransaction {
  const confirmationsRaw = Array.isArray(json.confirmations)
    ? json.confirmations
    : [];
  const confirmations: SafeConfirmation[] = confirmationsRaw.map(
    (entry, index) => {
      const row = entry as Record<string, unknown>;
      const owner = asServiceAddress(
        row.owner,
        `confirmations[${index}].owner`,
      );
      const signature = asServiceHex(
        row.signature,
        `confirmations[${index}].signature`,
      );
      return { owner, signature };
    },
  );

  const nonce =
    typeof json.nonce === "number"
      ? BigInt(json.nonce)
      : BigInt(String(json.nonce ?? "0"));

  const tx = buildSafeTxFields({
    to: asServiceAddress(json.to, "to"),
    data: asServiceHex(json.data, "data"),
    operation: Number(json.operation) === 1 ? 1 : 0,
    nonce,
    value: BigInt(String(json.value ?? "0")),
  });

  const safeTxHash = asServiceHex(
    json.safeTxHash ?? json.contractTransactionHash,
    "safeTxHash",
  );

  const executionTxHash =
    typeof json.transactionHash === "string" && isHex(json.transactionHash)
      ? json.transactionHash
      : undefined;

  return {
    safe: asServiceAddress(json.safe, "safe"),
    safeTxHash,
    tx,
    confirmations,
    confirmationsRequired: Number(json.confirmationsRequired ?? 1),
    isExecuted: Boolean(json.isExecuted),
    executionTxHash,
  };
}

/** Fetch a multisig transaction from the Safe Transaction Service. */
export async function fetchSafeTransaction(
  serviceUrl: string,
  safeTxHash: Hex,
): Promise<SafeServiceTransaction> {
  const base = serviceBaseUrl(serviceUrl);
  const url = `${base}/api/v1/multisig-transactions/${safeTxHash}/`;
  const response = await fetch(url);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Safe Transaction Service GET failed (${response.status}): ` +
        `${detail || response.statusText}`,
    );
  }
  const json = (await response.json()) as Record<string, unknown>;
  return parseServiceTransaction(json);
}

/** POST an owner confirmation signature for a pending Safe transaction. */
export async function postSafeConfirmation(
  serviceUrl: string,
  safeTxHash: Hex,
  signature: Hex,
): Promise<void> {
  const base = serviceBaseUrl(serviceUrl);
  const url = `${base}/api/v1/multisig-transactions/${safeTxHash}/confirmations/`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signature }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Safe Transaction Service confirmation rejected (${response.status}): ` +
        `${detail || response.statusText}`,
    );
  }
}

/** Assert `signer` is an on-chain owner of `safe`. */
export async function assertSafeOwner(
  rpcUrl: string,
  safe: Address,
  signer: Address,
): Promise<void> {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const owners = await client.readContract({
    address: safe,
    abi: SAFE_OWNERS_ABI,
    functionName: "getOwners",
  });
  const normalized = signer.toLowerCase();
  if (!owners.some((owner) => owner.toLowerCase() === normalized)) {
    throw new Error(
      `Signer ${signer} is not a Safe owner. On-chain owners: ${owners.join(", ")}`,
    );
  }
}

/** Pack owner signatures in ascending owner-address order for execTransaction. */
export function packSafeSignatures(confirmations: SafeConfirmation[]): Hex {
  if (confirmations.length === 0) {
    throw new Error("cannot pack an empty confirmation set");
  }
  const sorted = [...confirmations].sort((left, right) =>
    left.owner.toLowerCase() < right.owner.toLowerCase() ? -1 : 1,
  );
  return concat(sorted.map((entry) => entry.signature));
}

function hasOwnerConfirmation(
  confirmations: SafeConfirmation[],
  owner: Address,
): boolean {
  const normalized = owner.toLowerCase();
  return confirmations.some(
    (entry) => entry.owner.toLowerCase() === normalized,
  );
}

/** Poll the Transaction Service until threshold confirmations are collected. */
export async function waitForSafeConfirmations(
  serviceUrl: string,
  safeTxHash: Hex,
  confirmationsRequired: number,
  options?: { attempts?: number; delayMs?: number },
): Promise<SafeServiceTransaction> {
  const attempts = options?.attempts ?? 20;
  const delayMs = options?.delayMs ?? 1500;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const tx = await fetchSafeTransaction(serviceUrl, safeTxHash);
    if (tx.confirmations.length >= confirmationsRequired || tx.isExecuted) {
      return tx;
    }
    await Bun.sleep(delayMs);
  }
  throw new Error(
    `timed out waiting for Safe confirmations on ${safeTxHash} ` +
      `(required ${confirmationsRequired})`,
  );
}

export type ExecuteSafeTransactionInput = {
  rpcUrl: string;
  safe: Address;
  tx: SafeTxFields;
  signatures: Hex;
  signerKey: Hex;
};

/** Simulate and broadcast Safe.execTransaction for a fully confirmed SafeTx. */
export async function executeSafeTransaction(
  input: ExecuteSafeTransactionInput,
): Promise<Hex> {
  const account = privateKeyToAccount(input.signerKey);
  const publicClient = createPublicClient({
    transport: http(input.rpcUrl),
  }) as PublicClient;
  const walletClient = createWalletClient({
    account,
    transport: http(input.rpcUrl),
  });

  const args = [
    input.tx.to,
    input.tx.value,
    input.tx.data,
    input.tx.operation,
    input.tx.safeTxGas,
    input.tx.baseGas,
    input.tx.gasPrice,
    input.tx.gasToken,
    input.tx.refundReceiver,
    input.signatures,
  ] as const;

  const { request } = await publicClient.simulateContract({
    address: input.safe,
    abi: SAFE_EXEC_ABI,
    functionName: "execTransaction",
    args,
    account,
  });

  const hash = await walletClient.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`Safe execTransaction reverted: ${hash}`);
  }
  return hash;
}

export type ApproveSafeTransactionInput = {
  rpcUrl: string;
  serviceUrl: string;
  safe: Address;
  chainId: number;
  safeTxHash: Hex;
  expectedTx: SafeTxFields;
  signerKey: Hex;
  signerAddress: Address;
  confirmOnly: boolean;
};

/**
 * Sign a pending Safe transaction, post the confirmation, and optionally
 * execute it on-chain once the threshold is met.
 */
export async function approveSafeTransaction(
  input: ApproveSafeTransactionInput,
): Promise<{
  executionTxHash?: Hex | undefined;
  serviceTx: SafeServiceTransaction;
}> {
  await assertSafeOwner(input.rpcUrl, input.safe, input.signerAddress);

  const expectedHash = computeSafeTxHash(
    input.chainId,
    input.safe,
    input.expectedTx,
  );
  if (expectedHash !== input.safeTxHash) {
    throw new Error(
      `proposal safeTxHash ${input.safeTxHash} does not match rebuilt ` +
        `SafeTx hash ${expectedHash}`,
    );
  }

  let serviceTx = await fetchSafeTransaction(
    input.serviceUrl,
    input.safeTxHash,
  );
  if (serviceTx.isExecuted) {
    return { executionTxHash: serviceTx.executionTxHash, serviceTx };
  }

  const signature = await signSafeTxHash(input.signerKey, input.safeTxHash);
  if (!hasOwnerConfirmation(serviceTx.confirmations, input.signerAddress)) {
    await postSafeConfirmation(input.serviceUrl, input.safeTxHash, signature);
    serviceTx = await fetchSafeTransaction(input.serviceUrl, input.safeTxHash);
  }

  if (input.confirmOnly) {
    return { serviceTx };
  }

  serviceTx = await waitForSafeConfirmations(
    input.serviceUrl,
    input.safeTxHash,
    serviceTx.confirmationsRequired,
  );

  if (serviceTx.isExecuted) {
    return { executionTxHash: serviceTx.executionTxHash, serviceTx };
  }

  const packed = packSafeSignatures(serviceTx.confirmations);
  const executionTxHash = await executeSafeTransaction({
    rpcUrl: input.rpcUrl,
    safe: input.safe,
    tx: serviceTx.tx,
    signatures: packed,
    signerKey: input.signerKey,
  });
  return { executionTxHash, serviceTx };
}
