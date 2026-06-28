# Plan 0001 — From-release integration confidence

**Status:** IMPLEMENTED  
**Date:** 2026-06-28  
**Parent context:** FOR-148 Tier 1 follow-on (Option A)

## Prerequisites (completed before this plan)

| Item | Status |
|------|--------|
| Ship release artefacts (univocity-tools v0.6.0, univocity v0.1.4) | Done |
| Linear hygiene (FOR-150–152, 154–156 closed; FOR-153 backlog) | Done |

## Goal

Integration confidence for the foundry-free `deploy imutable --from-release`
EOA path: anvil e2e test, CI job, operator smoke runbook.

## Deliverables

| Slice | Change |
|-------|--------|
| 1 | `from-release.anvil.test.ts` + shared `from-release-fixtures.ts` |
| 2 | `integration-anvil` job in `.github/workflows/ci.yml` |
| 3 | `docs/agents/e2e-deploy.md`, CONTEXT glossary, AGENTS worktrees |

## Verification

```bash
bun test
bun test packages/deployer/test/e2e/from-release.anvil.test.ts
bun run check && bun run typecheck
```

## Out of scope

- Gated CI against published GitHub release assets
- Mandate live CI chaining deploy → onboard
- Real ImutableUnivocity bytecode in anvil test (fixture `0x6001` intentional)
