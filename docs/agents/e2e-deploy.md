# E2e deploy confidence tiers

Deployer integration tests and operator smoke checks are split into **five**
**confidence tiers**. Pick the tier that matches your path — ephemeral
cross-stack provision and foundry-free `--from-release` are different flows.

| Path | Command / test | Foundry on machine? |
|------|----------------|---------------------|
| Ephemeral e2e provision | `deploy provision e2e` | Yes (`anvil`, `forge`, `cast`) |
| From-release EOA deploy | `deploy imutable --from-release <tag>` | **No** (deployer binary only) |
| Fresh-chain CREATE3 + UUPS | `deploy create3 --from-release` then `deploy uups --from-release` | **No** |

See also [plan-0049](../../../canopy/docs/plans/plan-0049-e2e-imutable-provision-consolidation.md)
(provision consolidation), [ADR-0010](../adr/adr-0010-deploy-manifest-format.md)
(deploy-manifest trust model), and [ADR-0012](../adr/adr-0012-foundry-free-uups-deploy.md)
(UUPS foundry-free deploy).

## Tier A — stub (always CI)

**Test:** `packages/deployer/test/deploy-imutable-from-release.test.ts`

Stub GitHub client + fake viem JSON-RPC stub. Proves
`runDeployImutableFromRelease` orchestration (resolve → propose → execute →
write manifest) without chain I/O. Runs in the default `check` CI job.

## Tier B-provision — anvil + forge (landed)

**Test:** `packages/deployer/test/provision-imutable-anvil.test.ts`

Real anvil with `forge`/`cast` on PATH. Covers `runProvisionImutableAlg` /
`deploy provision e2e` (cross-stack ephemeral Univocity). Port **18545**.
**Not** a substitute for from-release confidence.

## Tier B-from-release — anvil, foundry-free (integration-anvil CI)

**Test:** `packages/deployer/test/e2e/from-release.anvil.test.ts`

Real anvil + viem; stub GitHub serves fixture deploy-manifest + `.sha256`
sidecar. `PATH` is cleared of `forge`/`cast` during the run. Port **18546**.

```bash
bun test packages/deployer/test/e2e/from-release.anvil.test.ts
```

Skips when `anvil` is not on PATH. CI job: `integration-anvil` in
`.github/workflows/ci.yml` (Foundry toolchain installed in that job only).

## Tier B-uups — anvil, foundry-free CREATE3 + UUPS (integration-anvil CI)

**Test:** `packages/deployer/test/e2e/uups-from-release.anvil.test.ts`

Committed real deploy-manifest fixture (`CREATE3Factory`, `UUPSUnivocity`,
`ERC1967Proxy`). Deploys shared factory then UUPS proxy on fresh anvil; asserts
proxy at the golden CREATE3 address from `deployment.json` ephemeral config.
Port **18547**.

```bash
bun test packages/deployer/test/e2e/uups-from-release.anvil.test.ts
```

## Tier C — manual release smoke (operator)

Run after published tags exist. As of 2026-06-28:

- **univocity-tools** [v0.6.0](https://github.com/forestrie/univocity-tools/releases/tag/v0.6.0):
  `deployer-darwin-arm64` or `deployer-linux-x64` + `.sha256` sidecar.
- **univocity** [v0.1.4](https://github.com/forestrie/univocity/releases/tag/v0.1.4):
  `deploy-manifest-v0.1.4.json` + `.sha256` sidecar.

Checklist:

1. Download the deployer binary and sidecar for your platform; verify sha256.
2. Set `DEPLOY_KEY` and `RPC_URL` for the target chain.
3. Run:
   ```bash
   ./deployer-linux-x64 deploy imutable \
     --from-release v0.1.4 \
     --bootstrap-alg ks256 \
     --bootstrap-ks256-signer <OWNER> \
     --rpc-url "$RPC_URL"
   ```
4. Confirm sidecar verification log, deployment manifest written under
   `--work-dir`, and `imutableUnivocity` address printed.
5. Optional Step 2 (onboard): [mandate FORKING.md](../../../mandate/FORKING.md)
   with `univocityAddr` from the deployment manifest.

Use **`v0.1.4`** (manifest asset) — older docs referencing `v0.4.0` fall back
to tarball extraction when no `deploy-manifest-<tag>.json` exists on the
release.

### Fresh-chain CREATE3 + UUPS (foundry-free)

After a Univocity release ships `UUPSUnivocity` and `ERC1967Proxy` manifest
entries:

1. Download deployer binary; set `DEPLOY_KEY`, `RPC_URL`, `UPGRADE_ADMIN`.
2. Deploy shared CREATE3 factory (no-op when already present):
   ```bash
   ./deployer-linux-x64 deploy create3 --from-release v0.1.4 --rpc-url "$RPC_URL"
   ```
3. Deploy UUPS proxy:
   ```bash
   ./deployer-linux-x64 deploy uups \
     --from-release v0.1.4 \
     --upgrade-admin "$UPGRADE_ADMIN" \
     --bootstrap-alg ks256 \
     --bootstrap-ks256-signer <OWNER> \
     --rpc-url "$RPC_URL"
   ```
4. Predict address without broadcasting:
   ```bash
   ./deployer-linux-x64 deploy uups predict --deploy-key "$DEPLOY_KEY"
   ```
5. Confirm `uups-deployment` manifest under `--work-dir` lists `proxy` and
   `implementation` addresses.

## Tier D — browser deploy (manual)

**App:** [univocity-deploy](https://univocity-deploy.pages.dev) (or local
`bun run --filter @univocity-tools/deploy-web dev` with Privy env).

The deploy-web app mounts Privy's embedded-wallet iframe on load so Privy email
login can create/sign with an embedded wallet. For hermetic UI checks without
Privy, use `PUBLIC_E2E_PRIVY=mock` (see [deploy-web.md](./deploy-web.md)).

Checklist:

1. Set `TESTING_PRIVY_APP_ID` (shared Forestrie testing Privy app) and allowlist
   the Pages origin, or use injected wallet (or `PUBLIC_E2E_PRIVY=mock` locally).
2. Open the app; connect wallet on target chain (default Base Sepolia `84532`).
3. Fetch & verify manifest for **`v0.1.4`** (or drag-drop manifest + `.sha256`).
4. Choose KS256 bootstrap (generate or paste signer); confirm genesis-critical warning.
5. Deploy; wait for receipt; download `{ chainId, univocityAddr, bootstrapAlg }`.
6. Optional Step 2: [mandate FORKING.md](../../../mandate/FORKING.md) onboard
   request with `univocityAddr` from genesis JSON.

See [deploy-web.md](./deploy-web.md) for env vars and CI deploy workflow.
