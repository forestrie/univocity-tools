import Privy, {
  LocalStorage,
  getEntropyDetailsFromUser,
  getUserEmbeddedEthereumWallet,
} from "@privy-io/js-sdk-core";
import { getPrivyAppId, getPrivyClientId, isE2ePrivyMock } from "../env.js";
import { getPrivyDeploySupportedChains } from "./privy-chains.js";
import { ensurePrivyEmbeddedWalletBridge } from "./privy-iframe.js";
import {
  MOCK_E2E_WALLET_ADDRESS,
  createMockEthereumProvider,
} from "./privy/mock-ethereum-provider.js";
import { normalizeEthereumAccounts } from "./wallet-accounts.js";

export type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

let privyClient: Privy | null = null;
let initPromise: Promise<Privy> | null = null;
let mockLoggedIn = false;

export async function getPrivyClient(): Promise<Privy> {
  if (isE2ePrivyMock()) {
    throw new Error(
      "getPrivyClient is unavailable when PUBLIC_E2E_PRIVY=mock; use mock wallet APIs",
    );
  }
  if (typeof window === "undefined") {
    throw new Error("Privy client is browser-only");
  }
  const appId = getPrivyAppId();
  if (!appId) {
    throw new Error("TESTING_PRIVY_APP_ID is not configured");
  }
  if (privyClient) {
    return privyClient;
  }
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    const clientId = getPrivyClientId();
    const client = new Privy({
      appId,
      ...(clientId ? { clientId } : {}),
      storage: new LocalStorage(),
      supportedChains: getPrivyDeploySupportedChains(),
    });
    await client.initialize();
    privyClient = client;
    return client;
  })();
  return initPromise;
}

export type PrivyEmailLoginOptions = {
  otp?: string;
  /** Privy test users with static OTP can skip sendCode. */
  skipSendCode?: boolean;
  createOnLogin?: "off" | "users-without-wallets" | "all-users";
};

export async function loginWithPrivyEmail(
  email: string,
  options?: PrivyEmailLoginOptions,
): Promise<void> {
  if (isE2ePrivyMock()) {
    if (!email.trim()) {
      throw new Error("Email required for mock Privy login");
    }
    mockLoggedIn = true;
    return;
  }

  const privy = await getPrivyClient();
  await ensurePrivyEmbeddedWalletBridge(privy);
  const otp = options?.otp;
  const createOnLogin = options?.createOnLogin ?? "users-without-wallets";
  if (!(options?.skipSendCode && otp)) {
    await privy.auth.email.sendCode(email);
  }
  const code =
    otp?.trim() ||
    window.prompt("Enter the verification code sent to your email");
  if (!code?.trim()) {
    throw new Error("Verification code required");
  }
  await privy.auth.email.loginWithCode(
    email,
    code.trim(),
    "login-or-sign-up",
    {
      embedded: { ethereum: { createOnLogin } },
    },
  );
}

export async function getPrivyAccessToken(): Promise<string | null> {
  const privy = await getPrivyClient();
  return privy.getAccessToken();
}

export async function getPrivyIdentityToken(): Promise<string | null> {
  const privy = await getPrivyClient();
  return privy.getIdentityToken();
}

export async function logoutPrivy(): Promise<void> {
  if (isE2ePrivyMock()) {
    mockLoggedIn = false;
    return;
  }
  const privy = await getPrivyClient();
  await privy.auth.logout();
}

export async function getPrivyEthereumProvider(): Promise<EthereumProvider | null> {
  if (isE2ePrivyMock()) {
    if (!mockLoggedIn) {
      return null;
    }
    return createMockEthereumProvider();
  }

  const privy = await getPrivyClient();
  await ensurePrivyEmbeddedWalletBridge(privy);
  const { user } = await privy.user.get();
  if (!user) {
    return null;
  }
  const wallet = getUserEmbeddedEthereumWallet(user);
  if (!wallet) {
    return null;
  }
  const details = getEntropyDetailsFromUser(user);
  if (!details) {
    return null;
  }
  const provider = await privy.embeddedWallet.getEthereumProvider({
    wallet,
    entropyId: details.entropyId,
    entropyIdVerifier: details.entropyIdVerifier,
  });
  return provider as EthereumProvider;
}

export async function getPrivyWalletAddress(): Promise<string | null> {
  if (isE2ePrivyMock()) {
    return mockLoggedIn ? MOCK_E2E_WALLET_ADDRESS : null;
  }

  const privy = await getPrivyClient();
  const { user } = await privy.user.get();
  if (!user) {
    return null;
  }
  const wallet = getUserEmbeddedEthereumWallet(user);
  return wallet?.address ?? null;
}

export function resetPrivyClientForTests(): void {
  privyClient = null;
  initPromise = null;
  mockLoggedIn = false;
}

/** Injected EIP-1193 provider (MetaMask, etc.). */
export function getInjectedProvider(): EthereumProvider | undefined {
  const eth = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  return eth;
}

export async function requestInjectedAccounts(): Promise<string[]> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No injected wallet found (install MetaMask or similar)");
  }
  const accounts = normalizeEthereumAccounts(
    await provider.request({
      method: "eth_requestAccounts",
    }),
  );
  if (accounts.length === 0) {
    throw new Error("wallet did not return an account");
  }
  return accounts;
}
