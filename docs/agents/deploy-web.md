# deploy-web agent guide

Browser-hosted **ImutableUnivocity** EOA deploy wizard (`apps/deploy-web`).

## Stack

- Vite + TypeScript SPA
- `@univocity-tools/deploy-core` — manifest verify, bootstrap, tx data (no Node polyfills)
- `@privy-io/js-sdk-core` — embedded wallet (optional injected EIP-1193 path)
- viem `WalletClient` + `sendTransaction` for contract creation

## Local dev

```bash
cd apps/deploy-web
bun install   # from repo root
doppler run --project mandate-forestrie --config dev -- bun run dev
```

Or export `TESTING_PRIVY_APP_ID` in the shell. Vite reads it via `vite.config.ts`
(no `VITE_` prefix required in Doppler).

Env:

| Variable | Purpose |
|----------|---------|
| `TESTING_PRIVY_APP_ID` | Shared Forestrie testing Privy app id (public; safe in client bundle) |
| `TESTING_PRIVY_CLIENT_ID` | Optional Privy client id |
| `TESTING_PRIVY_APP_SECRET` | Server-side only — **not** used by deploy-web; keep out of Vite |
| `VITE_DEFAULT_RELEASE_TAG` | Default manifest tag (`latest` → newest GitHub release) |
| `VITE_DEFAULT_CHAIN_ID` | Default chain (`84532`) |
| `VITE_DEFAULT_RPC_URL` | Receipt polling RPC |
| `PUBLIC_E2E_PRIVY` | Set to `mock` for hermetic UI / future Playwright (no Privy network). Unset in production. |

CI runs `bun run check:client-secrets` after `build` to ensure server-only env
names never appear in `apps/deploy-web/dist`.

### Bootstrap key custody

Generated KS256 keys show the **private key** in-page; deploy is blocked until
the operator checks “I have stored the bootstrap key material”. ES256 deploy
requires the same acknowledgement when PEM material is present. The bootstrap
signer is genesis-critical and may differ from the deploy wallet.

### Privy embedded wallet iframe

`@privy-io/js-sdk-core` requires a **hidden Privy iframe** for embedded-wallet
create/sign (`embeddedWallet.getURL()`, `setMessagePoster`, `window` `message`
→ `embeddedWallet.onMessage`). [`src/lib/privy-iframe.ts`](../../apps/deploy-web/src/lib/privy-iframe.ts)
mounts this on app load; [`src/lib/privy.ts`](../../apps/deploy-web/src/lib/privy.ts)
awaits the bridge before login wallet creation and `getEthereumProvider()`.

Without the iframe, Privy email login works but deploy signing fails with
“Embedded wallet proxy not initialized”.

### Wallet network (Base Sepolia)

Privy embedded wallets default to **Ethereum mainnet (chainId 1)** unless the app
calls `wallet_switchEthereumChain`. deploy-web switches to the selected supported
network on connect and again before deploy (`ensureWalletChain` in
[`src/lib/wallet-chain.ts`](../../apps/deploy-web/src/lib/wallet-chain.ts)).

Supported deploy chains are listed in
[`src/lib/supported-deploy-chains.ts`](../../apps/deploy-web/src/lib/supported-deploy-chains.ts)
(today: **Base Sepolia / 84532** only). Injected MetaMask wallets may require
`wallet_addEthereumChain` on first use; the app handles error **4902** automatically.

There is no reliable “default chain” control in the Privy dashboard for
`@privy-io/js-sdk-core`; chain alignment is **app-side**.

### Mock Privy seam (`PUBLIC_E2E_PRIVY=mock`)

Hermetic path for local UI and future in-repo Playwright (mandate plan-0047
convention). [`src/lib/privy/mock-ethereum-provider.ts`](../../apps/deploy-web/src/lib/privy/mock-ethereum-provider.ts)
returns fixed address `0xe2E0000000000000000000000000000000000000001` and
deterministic `eth_sendTransaction` — no Privy network. Real Privy integration
tests (`test:privy`) do **not** set this flag.

```bash
PUBLIC_E2E_PRIVY=mock bun run --filter @univocity-tools/deploy-web dev
PUBLIC_E2E_PRIVY=mock bun run --filter @univocity-tools/deploy-web test:mock
```

### Privy app setup (dashboard)

Privy apps are created in the [Privy dashboard](https://dashboard.privy.io) only
(no create-app API). Use **one shared testing app** for Forestrie client tools
(deploy-web, local Mandate UI, etc.) rather than per-product apps.

1. Create app (e.g. **Forestrie testing**).
2. **Basics** → copy App ID → `TESTING_PRIVY_APP_ID` in Doppler `mandate-forestrie`.
3. **Login methods** → enable Email (and any others you need).
4. **Embedded wallets** → enable Ethereum, create on login as needed.
5. **Allowed domains** → add:
   - `http://localhost:5175` (deploy-web dev)
   - `http://localhost:5173` (typical Vite ports if shared)
   - `https://univocity-deploy.pages.dev` (Pages prod)
   - Mandate Pages origins you use locally/prod
6. App secret → `TESTING_PRIVY_APP_SECRET` in Doppler for **server** workers only
   (`@mandate/privy-admin`, signer BFF) — never inject into deploy-web build.

## Tests

```bash
# Unit tests (mocked wallet; no Doppler)
bun run --filter @univocity-tools/deploy-web test

# Mock Privy seam (PUBLIC_E2E_PRIVY=mock)
bun run --filter @univocity-tools/deploy-web test:mock

# Privy integration (Doppler mandate-forestrie dev secrets)
doppler run --project mandate-forestrie --config dev -- \
  bun run --filter @univocity-tools/deploy-web test:privy
```

| Variable | Purpose |
|----------|---------|
| `TESTING_PRIVY_APP_JWKS` | JWKS URL to verify access/identity tokens in integration tests |
| `TESTING_PRIVY_ACCOUNT0_EMAIL` | Privy dashboard test user email |
| `TESTING_PRIVY_ACCOUNT0_OTP` | Static OTP for that test user |
| `TESTING_PRIVY_ACCOUNT0_PHONE` | Optional; phone login not used by deploy-web yet |

Integration tests log in once with `skipSendCode` + static OTP and verify JWTs
against `TESTING_PRIVY_APP_JWKS`. They **skip automatically in CI** when secrets
are absent.

**Test user wallet:** the Privy test account may be email-only until a browser
login creates an embedded wallet (`createOnLogin: users-without-wallets`). The
app mounts the Privy embedded-wallet iframe on load so the first interactive
login can create a wallet and sign deploy txs. Alternatively add an embedded
wallet to the test user in the Privy dashboard.

## Hosting

Cloudflare Pages project `univocity-deploy` — see
`.github/workflows/deploy-deploy-web.yml`. Set GitHub repo variable
`TESTING_PRIVY_APP_ID` for production builds.

Manual acceptance: [e2e-deploy.md](./e2e-deploy.md) Tier D.

## Related

- [ADR-0011](../adr/adr-0011-browser-safe-deploy-core.md)
- [plan-0001](../plans/plan-0001-tier2-browser-deploy.md)
- [mandate FORKING.md](../../../mandate/FORKING.md) Step 1 Path B-browser
