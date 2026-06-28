import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { RpcClients } from "../../rpc-client.js";

const TEST_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

export type FakeRpcClientsConfig = {
  txHash?: Hex;
  receiptStatus?: "success" | "reverted";
  contractAddress?: Address;
  chainId?: number;
  bytecode?: Record<string, Hex | "0x" | undefined>;
  /** `${address}:${slot}` → 32-byte storage word. */
  storage?: Record<string, Hex>;
  balance?: bigint;
  sendRawTransaction?: (serialized: Hex) => Promise<Hex>;
};

/** Fake viem clients for write/broadcast unit tests. */
export function createFakeRpcClients(
  config: FakeRpcClientsConfig = {},
): RpcClients {
  const account = privateKeyToAccount(TEST_KEY);
  const txHash =
    config.txHash ??
    ("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" as Hex);

  const walletClient = {
    sendTransaction: async () => txHash,
    account,
  } as unknown as WalletClient;

  const publicClient = {
    getChainId: async () => config.chainId ?? 84532,
    waitForTransactionReceipt: async () => ({
      status: config.receiptStatus ?? "success",
      contractAddress: config.contractAddress,
    }),
    getBytecode: async ({ address }: { address: Address }) =>
      config.bytecode?.[address.toLowerCase()] ??
      config.bytecode?.[address] ??
      "0x",
    getStorageAt: async ({
      address,
      slot,
    }: {
      address: Address;
      slot: Hex;
    }) => {
      const key = `${address.toLowerCase()}:${slot.toLowerCase()}`;
      return (
        config.storage?.[key] ??
        ("0x" + "0".repeat(64)) as Hex
      );
    },
    getBalance: async () => config.balance ?? 1n,
    sendRawTransaction: config.sendRawTransaction ?? (async () => txHash),
  } as unknown as PublicClient;

  return { publicClient, walletClient, account };
}
