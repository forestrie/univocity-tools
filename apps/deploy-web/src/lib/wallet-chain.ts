import type { EthereumProvider } from "./privy.js";
import {
  getSupportedDeployChain,
  type SupportedDeployChain,
} from "./supported-deploy-chains.js";

/** Read `eth_chainId` from an EIP-1193 provider (hex string or number). */
export async function readWalletChainId(
  provider: EthereumProvider,
): Promise<number> {
  const raw = await provider.request({ method: "eth_chainId" });
  if (typeof raw === "string") {
    return Number.parseInt(raw, 16);
  }
  if (typeof raw === "number") {
    return raw;
  }
  throw new Error("wallet did not return eth_chainId");
}

/** Reject deploy when the wallet network does not match the configured chain. */
export async function assertWalletChainMatches(
  provider: EthereumProvider,
  expectedChainId: number,
): Promise<void> {
  const walletChainId = await readWalletChainId(provider);
  if (walletChainId !== expectedChainId) {
    throw new Error(
      `wallet chainId ${walletChainId} does not match configured ${expectedChainId}`,
    );
  }
}

function chainIdToHex(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

function isChainNotAddedError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code: number }).code === 4902;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("4902") ||
    message.toLowerCase().includes("unrecognized chain")
  );
}

async function addWalletChain(
  provider: EthereumProvider,
  chain: SupportedDeployChain,
): Promise<void> {
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [chain.addChainParams],
  });
}

async function switchWalletChain(
  provider: EthereumProvider,
  chainId: number,
): Promise<void> {
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: chainIdToHex(chainId) }],
  });
}

/**
 * Align the connected wallet to a supported deploy chain via EIP-3326 / EIP-3085.
 * Privy embedded wallets default to Ethereum mainnet unless switched explicitly.
 */
export async function ensureWalletChain(
  provider: EthereumProvider,
  chainId: number,
): Promise<void> {
  const chain = getSupportedDeployChain(chainId);
  if (!chain) {
    throw new Error(`chain ${chainId} is not supported for deploy`);
  }

  const current = await readWalletChainId(provider);
  if (current === chainId) {
    return;
  }

  try {
    await switchWalletChain(provider, chainId);
  } catch (error) {
    if (!isChainNotAddedError(error)) {
      throw error;
    }
    await addWalletChain(provider, chain);
    await switchWalletChain(provider, chainId);
  }

  await assertWalletChainMatches(provider, chainId);
}
