# Univocity tools

TypeScript/Bun command-line tools and shared packages for building,
releasing, deploying, and operating Univocity smart contracts. Platform
domain terms live in [devdocs/glossary.md](../devdocs/glossary.md).

## Language

**Univocity tools repo**:
This repository (`univocity-tools`); TypeScript/Bun CLIs and shared
packages for contract build, release, deploy, and ops.
_Avoid_: univocity repo, contracts repo.

**Tool**:
A runnable CLI under `apps/` (for example `contract-artefacts`, `deployer`).
_Avoid_: service, script.

**Deployer (tool)**:
The `apps/deployer` CLI — contract deployment and infra configuration.
_Avoid_: conflating with Python deploy scripts in the **contracts repo**.

**Shared package**:
A library under `packages/` imported by two or more tools.
_Avoid_: util, common (without scope).

**Cart (tool)**:
The contract artefact CLI — binary `contract-artefacts`, package
`apps/contract-artefacts`; TypeScript helpers use `Cart*` names
(`defineCartCommand`, `CartCommonOptions`). Packages build archives,
extract them, and validate Safe batch JSON.
_Avoid_: **log builder** (platform: off-chain sequencing worker),
**Safe Transaction Builder** (Gnosis Safe UI — use **Safe batch JSON**
for the export artifact), **contracts repo** (Solidity checkout),
**`foundry-artefacts`** (format library, not the CLI).

**Safe batch JSON**:
Gnosis Safe Transaction Builder export consumed by univocity deploy
scripts (`safe_tx_from_builder_entry` in the contracts repo).
_Avoid_: builder batch, tx bundle.

**Contracts repo**:
[forestrie/univocity](https://github.com/forestrie/univocity) — Foundry
sources, `forge script`, Python proposers.
_Avoid_: on-chain repo.

**Contracts checkout root**:
The absolute filesystem path to a **contracts repo** checkout. Cart
and deployer commands resolve it from `--source-root`, `SOURCE_ROOT`,
git discovery for the `univocity` repo, or cwd. TypeScript field in app
code: `univocityRoot` (maps from cli-kit `sourceRoot`).
_Avoid_: “Univocity root” alone — collides with platform **Univocity
root bootstrap** (on-chain `rootLogId` transaction).

**Forge config path**:
The absolute path to a `foundry.toml` file used when a command invokes
forge. Parsed from CLI `--forge-config`; default filename is
`foundry.toml` relative to the contracts checkout root. TypeScript
field: `forgeConfig`.
_Avoid_: conflating CLI `--forge-config` with the forge binary flag
`--config-path`.

**Build root**:
The base directory the forge artifact directories (`out`, `src`,
`cache`, `lib`) resolve against; defaults to the **forge config path**
directory. CLI `--build-root`; TypeScript field: `buildRoot`.
_Avoid_: conflating with **contracts checkout root** or **work dir**.

**Work dir**:
The directory for generated build/deploy artifacts, default `.work`
resolved under the **contracts checkout root**. CLI `--work-dir`;
TypeScript field: `workDir`.
_Avoid_: temp dir, output dir.

**Build archive**:
The `tar.gz` produced by `contract-artefacts archive` — the forge
`out/` tree (including `out/build-info`) plus
`cache/solidity-files-cache.json` — that lets consumers deploy, verify,
and generate bindings without the foundry toolchain. Default base name
`build` (`build.tar.gz`), set via `--archive-name`. Sources are not
shipped; they can be materialized via **archive extract** and **source
hydration**. Consumed by `contract-artefacts archive-extract`.
_Avoid_: build bundle, artifact tarball.

**Archive extract**:
The inverse of **build archive** packaging: unpack a `tar.gz` into a
**release root** and **hydrate sources**. CLI
`contract-artefacts archive-extract`.
_Avoid_: extract bundle, unpack.

**Release root**:
The directory where an **archive extract** places forge artefacts
(`out/`, `cache/`) and materialized Solidity sources. CLI
`--release-root`; env `RELEASE_ROOT`.
_Avoid_: work dir, contracts checkout root.

**Source hydration**:
Writing Solidity source files from forge `out/build-info` embedded
content into a **release root**. Skips paths that already exist.
_Avoid_: source restore, cache replay.

**Option mixin**:
Reusable citty `args` schema plus `parse*` helpers merged into an app's
`commonArgs` (for example `@univocity-tools/forge-options` on Cart,
`@univocity-tools/create3-options` on deployer).
_Avoid_: duplicating mixin flags only in `commoncli.ts` without a shared
package.

**Create3 config**:
JSONC at the **univocity tools repo** root describing shared Arachnid
proxy and CREATE3 factory addresses for deploy flows. Canonical filename:
`create3.jsonc`.
_Avoid_: `arachnid.jsonc` (removed; use `create3.jsonc`).

**Embedded Create3 defaults**:
Stable Create3 field values compiled into a distributed CLI from
`create3.jsonc` at build time.
_Avoid_: hand-maintained duplicate constants in TypeScript.

**Tools repo root**:
The absolute filesystem path to a **univocity tools repo** checkout.
Optional dev-time discovery locates repo-root `create3.jsonc`.
_Avoid_: conflating with **contracts checkout root** (`univocityRoot`).

**Proposal**:
The deployer-native JSON artifact emitted by `deploy propose …`
(`kind: "deploy-imutable"`, version 1) wrapping Safe Transaction
Builder-shaped transactions plus deploy metadata (`publishMode`, `from`,
`signerRole`, optional `safe` block). Consumed by `deploy execute`
(EOA) or `deploy approve` (Safe).
_Avoid_: conflating with **Safe batch JSON** (the Gnosis export shape) —
a proposal embeds transactions in that shape but is a superset.

**Propose / execute model**:
The deploy flow that gives the local (non-interactive) and Gnosis Safe
multisig paths one implementation. `publishMode` (`eoa` | `safe`) selects
the path: `eoa` → `deploy execute`; `safe` → `deploy approve`.
_Avoid_: “deploy command” for the pair; name the step (propose, approve,
or execute).

**Owner address**:
The address recorded as the proposal `from` for every transaction
(`--owner-address` / `OWNER_ADDRESS`); the Safe in the multisig path.
Preferred over deriving `from` from a key.
_Avoid_: conflating with **owner signer** (a key, execute-only).

**Deploy key**:
Shared deploy private key (`--deploy-key` / `DEPLOY_KEY`). On propose it
derives `from` (dev convenience, pre-empting **deploy address**) and signs
the SafeTx for `--safe-publish`; on execute it is the signing-key fallback.
_Avoid_: legacy `PRIVATE_KEY` env (removed; `create3` now uses `DEPLOY_KEY`).

**Deploy address**:
Convenience deployer address (`--deploy-address` / `DEPLOY_ADDRESS`) used
as the propose `from` only when neither **owner address** nor **deploy
key** is supplied. Propose-only.
_Avoid_: using it for execute — execute needs a key, not an address.

**Owner signer**:
Execute/approve private key (`--owner-signer` / `OWNER_SIGNER`) used to
sign and broadcast a local proposal or approve a Safe proposal; preferred
over the **deploy key**. Never read by propose.
_Avoid_: conflating with **owner address** (the logical `from`).

**Approve**:
The `deploy approve` subcommand: Safe-path step after **Safe publish**.
Consumes a `safe` proposal, signs with **owner signer** (preferred) or
**deploy key**, POSTs the confirmation to the Transaction Service, and by
default executes on-chain via Safe `execTransaction`. Use
`--confirm-only` to post the signature without executing.
_Avoid_: routing `safe` proposals through `deploy execute`.

**Safe publish**:
The `--safe-publish` flag on `deploy propose imutable`: sign the SafeTx
with the **deploy key** and POST it to the Safe Transaction Service,
producing a `safe` proposal (executed via `deploy approve`, not
`deploy execute`).
_Avoid_: expecting `deploy execute` to broadcast a `safe` proposal.

**Bootstrap key / bootstrap alg**:
The `ImutableUnivocity` constructor key fixed at deploy: `bootstrapAlg`
is `es256` (ALG*ES256 −7; key = 64-byte P-256 `x||y`) or `ks256`
(ALG_KS256 −65799; key = 20-byte address). Resolved by `bootstrap-key.ts`.
\_Avoid*: conflating with the platform **root bootstrap** checkpoint
(out of scope here).

## Example dialogue

**Dev:** We need to regenerate the deploy Safe batch before proposing on
Base Sepolia.

**Ops:** Run **Cart** (`contract-artefacts`) from **univocity-tools** with
`--source-root` pointing at the **contracts repo**, or `cd` into that
checkout so discovery finds the `univocity` git repo — then emit fresh
**Safe batch JSON**.
The canopy **log builder** is unrelated; that sequences transparency log
entries, not Gnosis Safe transactions.

**Dev:** Right — validation and propose logic will live here; Solidity
stays in the **contracts repo**. When we add forge steps, we'll pass the
**forge config path** to `forge --config-path`, not confuse it with our
CLI `--forge-config` flag name.

**Ops:** For CREATE3 infra on a new chain, run the **deployer tool**.
A redistributed binary uses **embedded Create3 defaults**; in a local
**univocity tools repo** checkout it picks up live `create3.jsonc`
automatically. Override with `--create3-config` when testing alternate
addresses — that's separate from **contracts checkout root**, which
still comes from `--source-root` (or git discovery for `univocity`).
