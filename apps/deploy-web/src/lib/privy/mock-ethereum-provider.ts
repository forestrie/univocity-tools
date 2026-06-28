import type { EthereumProvider } from "../privy.js";

/** Shared with mandate plan-0047 hermetic browser e2e (E2E-prefixed test address). */
export const MOCK_E2E_WALLET_ADDRESS =
  "0xe2E0000000000000000000000000000000000001";

export const MOCK_E2E_TX_HASH = `0x${"ab".repeat(32)}`;

const DEFAULT_CHAIN_ID_HEX = "0x14a34"; // Base Sepolia 84532

export type MockEthereumProviderOptions = {
  chainIdHex?: string;
  sendTransaction?: () => Promise<string>;
};

export function createMockEthereumProvider(
  options?: MockEthereumProviderOptions,
): EthereumProvider {
  const chainIdHex = options?.chainIdHex ?? DEFAULT_CHAIN_ID_HEX;
  const sendTransaction =
    options?.sendTransaction ?? (async () => MOCK_E2E_TX_HASH);

  return {
    async request({ method, params }) {
      switch (method) {
        case "eth_accounts":
        case "eth_requestAccounts":
          return [MOCK_E2E_WALLET_ADDRESS];
        case "eth_chainId":
          return chainIdHex;
        case "eth_sendTransaction":
          return sendTransaction();
        default:
          return null;
      }
    },
  };
}
