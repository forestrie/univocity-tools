---
id: adr-0011-e2e-provision-in-deployer
title: "E2e Imutable provision lives in deployer"
status: accepted
created: 2026-06-28
updated: 2026-06-28
refs: ["plan-0049-e2e-imutable-provision-consolidation"]
---

# E2e Imutable provision lives in deployer

Cross-stack e2e consumers (notably canopy) need ephemeral **ImutableUnivocity**
deploys per run: fetch a published build archive, propose + execute via EOA,
and verify on-chain `bootstrapConfig()` before Playwright exercises genesis
chain-binding.

That pipeline was first orchestrated in canopy Taskfiles and duplicated in
`tests-system.yml` bash. The deploy primitives already lived in
`contract-artefacts` and `deployer`; only the multi-step orchestration was
missing from the tools repo.

## Decision

Reusable e2e Imutable provision (`fetch → extract → propose → execute →
verify`) lives in `@univocity-tools/deployer` as callable `run*` APIs and
`deploy provision e2e`. Consumer repos keep secrets, Playwright env files,
and GitHub `GITHUB_OUTPUT` wiring.

## Considered options

- **All logic in canopy Taskfiles** — rejected: duplicates CI bash, does not
  dogfood `run*` exports, blocks reuse by mandate or other consumers.
- **New top-level `e2e-provision` app** — rejected: over-scoped; deployer
  already owns propose/execute.

## Consequences

- A univocity-tools release must ship before canopy CI pins the new command.
- Future consumers import `runProvisionImutableE2e` without copying shell.

See [ADR-0004](./adr-0004-deploy-propose-execute-model.md) and
[ADR-0009](./adr-0009-propose-from-build-archive.md).
