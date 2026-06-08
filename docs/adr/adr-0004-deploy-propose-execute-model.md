# Unified propose/execute deploy model

Deploying `ImutableUnivocity` must serve two first-class production paths:
a Gnosis Safe multisig (the owner is a Safe; a proposer signs and the
owners execute later) and a local, non-interactive flow (a key is held
locally and can both sign and broadcast). The earlier Python + Solidity
flow split these across `forge script` deploy, a separate Safe batch
generator, and standalone proposer/executor scripts, duplicating the
transaction-construction logic per path.

We split deployment into two `deployer deploy` subcommands sharing one
artifact. `propose imutable` builds the deployment data (`forge build` →
creation code + `abi.encode(int64 bootstrapAlg, bytes bootstrapKey)`) and
emits a deployer-native **proposal** JSON (`kind: "deploy-imutable"`,
version 1) wrapping Safe Transaction Builder-shaped transactions plus
metadata (`publishMode`, `from`, `signerRole`, optional `safe` block).
Without `--safe-publish` it is an `eoa` proposal (one contract-create,
`to: null`) pipeable to `execute`; with `--safe-publish` it is a `safe`
proposal whose SafeTx is signed with `--deploy-key` and POSTed to the
Safe Transaction Service. `execute` reads a proposal (file or stdin),
refuses `safe` proposals, asserts the resolved signer equals the
proposal `from`, and broadcasts via `cast send`.

The proposal `from` and the signing key are deliberately separate. On
propose, `--owner-address` (the logical owner / Safe) wins; otherwise the
address is derived from `--deploy-key` (a dev convenience that pre-empts
`--deploy-address`), then `--deploy-address`. On execute, the signing key
is `--owner-signer` (preferred) or `--deploy-key`, and its address must
match the recorded `from`. This owner-vs-signer split is the surprising
part of the model, so it is recorded here.

Bootstrap crypto (ES256 P-256 coordinate extraction via WebCrypto; KS256
address) is ported to TypeScript (viem + WebCrypto), so the deploy step no
longer needs the Solidity `Deploy.s.sol` / `GenerateSafeImutableUnivocityBatch.s.sol`
scripts; `forge` is used only for the build and `cast` only for chain I/O.
The Safe Transaction Service client is viem-native REST rather than the
`@safe-global` SDK, keeping the stack viem-only and ethers-free.

Considered separate per-mode commands (rejected: duplicates
transaction construction and diverges the local and multisig paths);
keeping the Solidity batch generator and only wrapping it (rejected:
retains `forge script` for deploy and the dual-script split); and the
official Safe SDK (rejected: heavier dependency, pulls in ethers).

Consequences: the proposal JSON is a stable interface (`deploy propose` →
`deploy execute` for EOA, or → `deploy approve` for Safe); root authority
bootstrap (`publishCheckpoint` / COSE receipt signing) remains out of scope
for a future `deploy … bootstrap` command. The legacy `PRIVATE_KEY` env is
dropped in favour of `DEPLOY_KEY` (see CONTEXT.md **Deploy key**). Safe
execution is documented in [ADR-0005](./adr-0005-safe-approve-command.md).

See [ADR-0002](./adr-0002-contracts-checkout-root-discovery.md) for
parse-time path resolution and
[ADR-0003](./adr-0003-create3-config-build-snapshot.md) for embedded
Create3 defaults; command tree and signer table in
[docs/agents/cli.md](../agents/cli.md).
