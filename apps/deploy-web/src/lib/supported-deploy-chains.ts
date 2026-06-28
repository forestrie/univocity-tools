import { baseSepolia } from "viem/chains";

/** Chain metadata for browser deploy (EIP-3085 add + switch). */
export type SupportedDeployChain = {
  chainId: number;
  name: string;
  rpcUrl: string;
  addChainParams: {
    chainId: string;
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
  };
};

/** Chains Mandate / Canopy dev onboarding supports for ImutableUnivocity deploy. */
export const SUPPORTED_DEPLOY_CHAINS: readonly SupportedDeployChain[] = [
  (() => {
    const blockExplorerUrl = baseSepolia.blockExplorers?.default?.url;
    return {
      chainId: baseSepolia.id,
      name: "Base Sepolia",
      rpcUrl: "https://sepolia.base.org",
      addChainParams: {
        chainId: `0x${baseSepolia.id.toString(16)}`,
        chainName: baseSepolia.name,
        nativeCurrency: baseSepolia.nativeCurrency,
        rpcUrls: [...baseSepolia.rpcUrls.default.http],
        ...(blockExplorerUrl ? { blockExplorerUrls: [blockExplorerUrl] } : {}),
      },
    };
  })(),
];

/** Lookup a supported chain by EIP-155 id. */
export function getSupportedDeployChain(
  chainId: number,
): SupportedDeployChain | undefined {
  return SUPPORTED_DEPLOY_CHAINS.find((chain) => chain.chainId === chainId);
}

/** Default deploy target (first supported chain). */
export function getDefaultDeployChain(): SupportedDeployChain {
  return SUPPORTED_DEPLOY_CHAINS[0]!;
}
