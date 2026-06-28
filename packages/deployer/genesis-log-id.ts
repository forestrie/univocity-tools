import { getAddress, type Address } from "viem";

/**
 * Derive mnemonic forest log UUID from an ImutableUnivocity address
 * (matches canopy `e2e-univocity:genesis-log-id` and
 * univocity/scripts/es256_common.py).
 */
export function genesisLogIdFromImutableAddress(address: string): string {
  let normalized: Address;
  try {
    normalized = getAddress(address);
  } catch {
    throw new Error(`expected 20-byte address, got ${address}`);
  }
  const h = normalized.slice(2).toLowerCase();
  if (h.length !== 40) {
    throw new Error(`expected 20-byte address, got ${address}`);
  }
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
