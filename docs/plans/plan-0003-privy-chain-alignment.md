# Plan 0003 — Privy wallet chain alignment (FOR-229)

**Status:** IMPLEMENTED  
**Date:** 2026-06-28  
**Repos:** univocity-tools (`deploy-web`), mandate (`@mandate/ui`)

## Problem

Privy embedded wallets report `eth_chainId` **1** (Ethereum mainnet) while
deploy-web targets **84532** (Base Sepolia). Deploy failed with:

`wallet chainId 1 does not match configured 84532`

Privy dashboard has no dependable default-chain setting for
`@privy-io/js-sdk-core`; apps must call `wallet_switchEthereumChain`.

## Solution

1. **deploy-web:** `ensureWalletChain` (switch + optional add chain) before deploy;
   network `<select>` from `SUPPORTED_DEPLOY_CHAINS`; show wallet chain after connect.
2. **mandate UI:** same chain helpers; wire `PUBLIC_DEFAULT_CHAIN_ID`; network
   selector on delegation console; align default to **84532**.
3. **Docs:** deploy-web.md, FORKING Path B′, service-secrets.md.

## Acceptance

- [x] Privy login on deploy-web → wallet switches to Base Sepolia → deploy succeeds.
- [x] Unit tests for `ensureWalletChain` (both repos).
- [x] Mandate `PUBLIC_DEFAULT_CHAIN_ID` defaults to 84532 in CI / `.env.example`.
- [x] Mandate delegation console shows network selector + wallet chain id.
