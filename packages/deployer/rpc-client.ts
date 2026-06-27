import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export type RpcClients = {
  publicClient: PublicClient;
  walletClient: WalletClient;
  account: ReturnType<typeof privateKeyToAccount>;
};

/** Build viem public + wallet clients for a deploy key and RPC URL. */
export function createRpcClients(rpcUrl: string, deployKey: Hex): RpcClients {
  const account = privateKeyToAccount(deployKey);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ transport });
  const walletClient = createWalletClient({ account, transport });
  return { publicClient, walletClient, account };
}

/** Return true when bytecode exists at `address`. */
export async function hasBytecodeAt(
  publicClient: PublicClient,
  address: Address,
): Promise<boolean> {
  const code = await publicClient.getBytecode({ address });
  return code !== undefined && code !== "0x" && code.length > 0;
}
