/** Vite public env (no secrets). */

import { DEFAULT_RELEASE_TAG } from "@univocity-tools/deploy-core";
import { getDefaultDeployChain } from "./lib/supported-deploy-chains.js";

/** Hermetic E2E / Playwright — deterministic mock Privy (mandate plan-0047 convention). */
export function isE2ePrivyMockFlag(value: string | undefined): boolean {
  return value === "mock";
}

export function isE2ePrivyMock(): boolean {
  return isE2ePrivyMockFlag(import.meta.env.PUBLIC_E2E_PRIVY);
}

export function getDefaultReleaseTag(): string {
  return (
    import.meta.env.VITE_DEFAULT_RELEASE_TAG?.trim() || DEFAULT_RELEASE_TAG
  );
}

/** Shared Forestrie testing Privy app (client-safe app id only). */
export function getPrivyAppId(): string | undefined {
  const fromProcess =
    typeof process !== "undefined"
      ? process.env.TESTING_PRIVY_APP_ID?.trim()
      : undefined;
  const fromVite = import.meta.env.TESTING_PRIVY_APP_ID?.trim();
  return fromProcess || fromVite || undefined;
}

export function getPrivyClientId(): string | undefined {
  const fromProcess =
    typeof process !== "undefined"
      ? process.env.TESTING_PRIVY_CLIENT_ID?.trim()
      : undefined;
  const fromVite = import.meta.env.TESTING_PRIVY_CLIENT_ID?.trim();
  return fromProcess || fromVite || undefined;
}

export function getDefaultRpcUrl(): string {
  const fromEnv = import.meta.env.VITE_DEFAULT_RPC_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return getDefaultDeployChain().rpcUrl;
}

export function getDefaultChainId(): number {
  const raw = import.meta.env.VITE_DEFAULT_CHAIN_ID?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return getDefaultDeployChain().chainId;
}
