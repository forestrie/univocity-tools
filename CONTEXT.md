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
A runnable CLI under `apps/` (for example `builder`).
_Avoid_: service, script.

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

## Example dialogue

**Dev:** We need to regenerate the deploy Safe batch before proposing on
Base Sepolia.

**Ops:** Run the **builder tool** from **univocity-tools** to emit fresh
**Safe batch JSON**; the canopy **log builder** is unrelated — that
sequences transparency log entries, not Gnosis Safe transactions.

**Dev:** Right — validation and propose logic will live here; Solidity
stays in the **contracts repo**.
