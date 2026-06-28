# Plan 0002 — Foundry-free CREATE3 factory and UUPS deploy from release

**Status:** IMPLEMENTED  
**Date:** 2026-06-28  
**Linear:** FOR-153

## Goal

Eliminate remaining `forge`/`cast` dependency for fresh-chain operators
deploying the shared CREATE3 factory and `UUPSUnivocity` proxy using only the
`deployer` binary and a published Univocity release.

## Deliverables

| Slice | Change |
|-------|--------|
| 1 | `deploy create3 --from-release` + sidecar verification on `--from-manifest` |
| 2 | `@univocity-tools/deploy-core` with extended manifest schema + `predictCreate3Address` |
| 3 | Univocity manifest generator emits `UUPSUnivocity` + `ERC1967Proxy` |
| 4 | `deploy uups` / `deploy uups predict` / `deploy uups --from-release` |
| 5 | Anvil e2e (`uups-from-release.anvil.test.ts`), CI `integration-anvil` e2e dir |
| 6 | ADR-0012, e2e-deploy runbook, ADR-0010 schema update |

## Verification

```bash
bun test
bun test packages/deployer/test/e2e/
bun run check && bun run typecheck
# univocity:
python3 scripts/test_generate_deploy_manifest.py
```

## Out of scope

- Browser (`deploy-web`) UUPS deploy
- Safe-based UUPS propose/execute
- On-chain UUPS upgrades and explorer verification
