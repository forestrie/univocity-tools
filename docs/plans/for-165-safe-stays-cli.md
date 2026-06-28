# ADR-0012: Safe deploy stays CLI-only

**Status:** Accepted (spike — FOR-165)  
**Date:** 2026-06-28  
**Related:** [FOR-149](https://linear.app/forestrie/issue/FOR-149),
[plan-0001](./plan-0001-tier2-browser-deploy.md)

## Context

Tier 2 adds browser EOA deploy for **ImutableUnivocity**. Operators may ask
whether Gnosis Safe multisig deploy (`deploy propose imutable`, CREATE2 via
CreateCall) should also run in the browser.

## Decision

**Safe deploy remains CLI-only.** The browser app deploys via EOA
`walletClient.sendTransaction({ data: deploymentData })` only.

Rationale:

- Safe flows need proposal JSON, EIP-712 signing, Transaction Service
  integration, and CreateCall calldata — high coupling to server-side tooling
  already in `@univocity-tools/deployer`.
- Browser Safe UX (owner roster, threshold, nonce) is a separate product surface
  with distinct threat model.
- FOR-149 scope is Step 1 EOA path for independent forks (FORKING Path B).

## Consequences

- `deploy-core` does not include Safe transaction builders beyond shared
  `performCreate2` helpers used by CLI.
- FOR-163 may add injected EIP-1193 for EOA deploy only — not Safe batching.
- Document CLI Safe path in [FORKING.md](../../../mandate/FORKING.md) and
  [cli.md](../agents/cli.md).
