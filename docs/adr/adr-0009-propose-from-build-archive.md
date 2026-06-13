# Propose imutable from a build archive (--release-root)

[ADR-0006](./adr-0006-build-archive-decouples-deploy.md) introduced **build
archives** and **archive extract** so consumers deploy without a Foundry
toolchain. Canopy e2e fresh provision fetches the published univocity
release and deploys via Safe CREATE2 without checking out the contracts
repo or running `forge build`.

Until v0.5.0, `deploy propose imutable` always invoked `forge build`
via `buildImutableArtifact`, even though `readImutableBytecode` could
parse prebuilt `ImutableUnivocity.json`. That blocked the composable
pipeline:

```text
contract-artefacts fetch-release
contract-artefacts archive-extract --release-root R
deployer deploy propose imutable --release-root R
deployer deploy approve <proposal>
```

## Decision

Add **`--release-root`** to `deploy propose imutable`, reusing the same
flag name, env (`RELEASE_ROOT`), and resolution helper
(`resolveReleaseRoot` in `@univocity-tools/cli-kit`) as
`archive-extract` and `archive-validate`.

When `--release-root` is set:

- Read creation bytecode from
  `<release-root>/out/ImutableUnivocity.sol/ImutableUnivocity.json`.
- Skip `requireForgeBin` and `forge build`.
- Keep `requireCastBin` for chain-id / Safe nonce when RPC is used.
- Make `--source-root` optional (no contracts checkout required).

When `--release-root` is absent, behaviour is unchanged (build from
source).

## Alternatives considered

- **`--build-archive-root`** (rejected): duplicates vocabulary; consumers
  already pass `--release-root` to `archive-extract`.
- **Fetch/extract inside propose** (rejected): breaks single-responsibility;
  compose existing Cart commands instead.
- **Always require forge** (rejected): forces cross-repo checkout in CI.

## Consequences

- Hard-to-reverse CLI surface: `--release-root` on propose is permanent.
- Canopy and other consumers can deploy published bytecode without Foundry
  beyond `cast`.
- `resolveReleaseRoot` is shared; contract-artefacts parsers delegate to
  it with `?? process.cwd()`; propose leaves it optional (undefined → build
  from source).
- Ship as **univocity-tools v0.5.0** before enabling canopy CI that depends
  on propose-from-archive.

See [ADR-0004](./adr-0004-deploy-propose-execute-model.md),
[ADR-0005](./adr-0005-safe-approve-command.md), and
[ADR-0008](./adr-0008-fetch-release-and-run.md).
