# ADR-0011: Browser-safe deploy-core boundary

**Status:** Accepted  
**Date:** 2026-06-28  
**Related:** [FOR-149](https://linear.app/forestrie/issue/FOR-149),
[ADR-0010](./adr-0010-deploy-manifest-format.md),
[plan-0001](../plans/plan-0001-tier2-browser-deploy.md)

## Context

Tier 2 adds a browser-hosted deploy wizard (`apps/deploy-web`) that must share
manifest parsing, bootstrap key resolution, and Imutable deployment-data
construction with the existing Bun deployer CLI — without duplicating crypto
logic or pulling Node/Bun APIs into the bundle.

## Decision

Extract **`@univocity-tools/deploy-core`** as the shared, **browser-safe**
package. The deployer CLI keeps all file/network/process I/O; deploy-web keeps
UI and wallet wiring. Both import deploy-core only for pure logic.

### Allowed in deploy-core

- `viem` (types, ABI encoding, address helpers)
- Web platform APIs (`crypto.subtle`, `fetch` is **not** used inside deploy-core)
- `Uint8Array`, `atob`/`btoa` via `encoding.ts`

### Forbidden in deploy-core

- `node:*` imports (`fs`, `path`, `child_process`, …)
- `Bun` globals and `bun` imports
- `Buffer`
- File I/O, subprocesses, GitHub download, archive extraction

### Enforcement

Root script `bun run check:browser-safe` scans `packages/deploy-core/**/*.ts`
and fails CI on forbidden patterns. Run after `check:subprocess` in
`.github/workflows/ci.yml`.

## Consequences

- Bootstrap key PEM handling uses `encoding.ts` instead of `Buffer`.
- `read-deploy-manifest.ts` in deployer re-exports pure helpers from deploy-core
  and keeps `Bun.file` / sidecar file verification locally.
- New deploy logic that must run in the browser belongs in deploy-core first;
  CLI wrappers stay thin re-exports or I/O adapters.
- CREATE3 / UUPS browser deploy remains out of scope; Safe deploy stays CLI
  only (see FOR-165).
