# Safe approve command

The unified propose/execute model (ADR-0004) originally left Safe
execution to the Safe Transaction Service UI or the contracts-repo Python
script `execute_safe_tx.py`. That split made CI and automation awkward:
after `deploy propose imutable --safe-publish`, a separate tool had to
fetch the pending SafeTx, sign as an owner, POST the confirmation, and
optionally call `execTransaction` on-chain.

We add `deploy approve [proposalFile]` as the Safe-path counterpart to
`deploy execute`. It reads a `publishMode: "safe"` proposal (file or
stdin), resolves the SafeTx hash from `proposal.safe.safeTxHash` (or
`--safe-tx-hash`), verifies the signer is a Safe owner, POSTs the owner
confirmation to the Transaction Service, and by default simulates and
executes on-chain via Safe `execTransaction`. `--confirm-only` posts the
signature only (mirrors Python `CONFIRM_ONLY=1`).

Signer resolution reuses the execute path: `--owner-signer` (preferred)
then `--deploy-key`. On propose, the deploy key signs the initial SafeTx
POST; on approve, either key may act as an owner signer. CI uses
`univocity.dev.DEPLOY_KEY` as the multisig owner signer when threshold
is one.

Considered extending `deploy execute` to handle Safe proposals (rejected:
EOA broadcast via `cast send` and Safe `execTransaction` differ enough
that one command would blur error modes and flags); keeping Python
`execute_safe_tx.py` as the canonical path (rejected: duplicates viem
logic already in `safe-client.ts`); and the official Safe SDK (rejected
in ADR-0004).

Consequences: the Safe path is `propose → approve` (not `propose →
execute`); EOA proposals still use `execute`; `deploy approve` requires
`--rpc-url`; non-imutable proposal kinds are out of scope until needed.

See [ADR-0004](./adr-0004-deploy-propose-execute-model.md) and
[docs/agents/cli.md](../agents/cli.md).
