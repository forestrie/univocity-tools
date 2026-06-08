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
A runnable CLI under `apps/` (for example `builder`, `deployer`).
_Avoid_: service, script.

**Deployer (tool)**:
The `apps/deployer` CLI — contract deployment and infra configuration.
_Avoid_: conflating with Python deploy scripts in the **contracts repo**.

**Shared package**:
A library under `packages/` imported by two or more tools.
_Avoid_: util, common (without scope).

**Builder (tool)**:
The `apps/builder` CLI — future home for artifact generation (Safe
batches, deploy manifests).
_Avoid_: **log builder** (platform: off-chain sequencing worker),
**Safe Transaction Builder** (Gnosis Safe UI — use **Safe batch JSON**
for the export artifact).

**Safe batch JSON**:
Gnosis Safe Transaction Builder export consumed by univocity deploy
scripts (`safe_tx_from_builder_entry` in the contracts repo).
_Avoid_: builder batch, tx bundle.

**Contracts repo**:
[forestrie/univocity](https://github.com/forestrie/univocity) — Foundry
sources, `forge script`, Python proposers.
_Avoid_: on-chain repo.

**Contracts checkout root**:
The absolute filesystem path to a **contracts repo** checkout. Builder
commands resolve it from `--univocity-root`, `UNIVOCITY_ROOT`, git
discovery, or cwd. TypeScript field: `univocityRoot`.
_Avoid_: “Univocity root” alone — collides with platform **Univocity
root bootstrap** (on-chain `rootLogId` transaction).

**Forge config path**:
The absolute path to a `foundry.toml` file used when a command invokes
forge. Parsed from CLI `--forge-config`; default filename is
`foundry.toml` relative to the contracts checkout root. TypeScript
field: `forgeConfig`.
_Avoid_: conflating CLI `--forge-config` with the forge binary flag
`--config-path`.

**Option mixin**:
Reusable citty `args` schema plus `parse*` helpers merged into an app's
`commonArgs` (for example `@univocity-tools/forge-options` on builder,
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

## Example dialogue

**Dev:** We need to regenerate the deploy Safe batch before proposing on
Base Sepolia.

**Ops:** Run the **builder tool** from **univocity-tools** with
`--univocity-root` pointing at the **contracts repo**, or `cd` into that
checkout so discovery finds it — then emit fresh **Safe batch JSON**.
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
still comes from `--univocity-root`.
