---
id: adr-0001-typescript-tools-sibling-repo
title: "TypeScript tools in a sibling repo"
status: accepted
created: 2026-06-07
updated: 2026-06-07
---

# TypeScript tools in a sibling repo

Univocity contract tooling lives in the **univocity-tools** repository
(Bun + TypeScript), not inside the Foundry **univocity** contracts
repo.

Solidity audit and CI stay focused on `src/` and `forge test`. CLIs can
evolve on Bun without coupling to `forge fmt`, slither, or Foundry
submodules. This matches Forestrie’s pattern of focused repos (canopy,
arbor, univocity).

Cross-repo workflows (for example `forge script` output consumed by a
TypeScript validator) require explicit paths such as `UNIVOCITY_ROOT`;
that trade-off is acceptable for clearer boundaries.
