/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_E2E_PRIVY?: string;
  readonly TESTING_PRIVY_APP_ID?: string;
  readonly TESTING_PRIVY_CLIENT_ID?: string;
  readonly VITE_DEFAULT_RELEASE_TAG?: string;
  readonly VITE_DEFAULT_CHAIN_ID?: string;
  readonly VITE_DEFAULT_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
