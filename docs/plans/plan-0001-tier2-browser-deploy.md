# Plan 0001 — Tier 2 browser-based Univocity install (FOR-149)

**Status:** Complete  
**Date:** 2026-06-28  
**Linear:** [FOR-149](https://linear.app/forestrie/issue/FOR-149)

## Goal

Browser EOA deploy of **ImutableUnivocity** from a hosted static app
(`apps/deploy-web`), zero local tooling. Bytecode from `deploy-manifest`
release assets; wallet via Privy (injected EIP-1193 follow-up).

## Prerequisites (complete)

- univocity-tools **v0.6.0** — deployer binaries + sha256
- univocity **v0.1.4** — `deploy-manifest-v0.1.4.json` + sidecar
- Tier 1 integration: [e2e-deploy.md](../agents/e2e-deploy.md)

## Stack

| Order | Issue | Deliverable |
|-------|-------|-------------|
| 1 | FOR-159 | `@univocity-tools/deploy-core`, ADR-0011, `check:browser-safe` |
| 2 | FOR-160 | `apps/deploy-web` Vite scaffold |
| 3 | FOR-161 | Manifest fetch + sidecar verify + drag-drop |
| 4 | FOR-162 | Privy EOA deploy + genesis JSON |
| 5 | FOR-164 | CF Pages + FORKING/README links |
| 6 | FOR-163 | Injected wallet (optional) |
| 7 | FOR-165 | Safe-stays-CLI decision doc |

## Canonical pins

- Manifest: `v0.1.4`
- Deployer binary: `v0.6.0`

See grill decisions and slice detail in the Cursor plan artifact (not
duplicated here).

## Follow-up (post FOR-149)

- Privy embedded-wallet iframe bridge + `PUBLIC_E2E_PRIVY=mock` seam —
  [deploy-web.md](../agents/deploy-web.md) (enables Tier D signing and hermetic
  UI; full embedded-wallet Playwright remains Phase 2 system-testing per
  [arc-0024](https://github.com/forestrie/devdocs/blob/main/arc/arc-0024-system-testing-architecture.md)).
