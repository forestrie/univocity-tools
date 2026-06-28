import { baseSepolia, type Chain } from "@privy-io/chains";

/**
 * Chains passed to Privy `supportedChains`. Embedded wallets default to the
 * first entry; switching only works for chains in this list.
 */
export function getPrivyDeploySupportedChains(): [Chain, ...Chain[]] {
  return [baseSepolia];
}
