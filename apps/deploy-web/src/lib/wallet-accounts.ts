import type { Address } from "viem";
import { isAddress } from "viem";
import type { EthereumProvider } from "./privy.js";

/** Normalize EIP-1193 account responses (array, single address, or missing). */
export function normalizeEthereumAccounts(value: unknown): Address[] {
  if (typeof value === "string" && isAddress(value)) {
    return [value];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  const accounts: Address[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && isAddress(entry)) {
      accounts.push(entry);
    }
  }
  return accounts;
}

/** Resolve a connected account from eth_accounts, then eth_requestAccounts. */
export async function resolveDeployAccount(
  provider: EthereumProvider,
  preferred?: string | null,
): Promise<Address> {
  if (preferred !== undefined && preferred !== null && isAddress(preferred)) {
    return preferred;
  }

  const methods = ["eth_accounts", "eth_requestAccounts"] as const;
  for (const method of methods) {
    const accounts = normalizeEthereumAccounts(
      await provider.request({ method }),
    );
    const account = accounts[0];
    if (account !== undefined) {
      return account;
    }
  }

  throw new Error("wallet has no account — reconnect MetaMask and retry");
}
