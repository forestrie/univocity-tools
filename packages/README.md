# Shared packages

## App companion packages (`packages/<app-name>/`)

Every CLI in `apps/<name>/` has a matching companion package:

```text
apps/contract-artefacts/src/cli.ts           → runMain
apps/contract-artefacts/src/command.ts       → citty tree
apps/contract-artefacts/src/commands/**      → thin parse + wire to run*

packages/contract-artefacts/commoncli.ts     → commonArgs, defineCartCommand
packages/contract-artefacts/options.ts       → ArchiveOptions, parseArchiveExtractOptions, …
packages/contract-artefacts/archive.ts       → runArchive
packages/contract-artefacts/archive-extract.ts → runArchiveExtract
packages/contract-artefacts/validate-batch.ts  → runValidateBatch
packages/contract-artefacts/main.ts          → re-export barrel
```

See [docs/agents/cli.md](../docs/agents/cli.md).

Generic helpers: **`@univocity-tools/cli-kit`**
(`mergeCommandArgs`, `defineCommandRunner`, `evaluateOptionValue` for
`${env}` / `${env:VAR}` option value sources, **`reporting`** for `Out`
and `--verbosity`).

## Cross-app packages

Add a package under `packages/` (other than `<app-name>/`) when **two
or more tools** need the same types, validation, or client logic.

**`@univocity-tools/forge-options`** — mixable `--forge-config` citty
flags and typed parse helpers. Cart (`contract-artefacts`) is the first consumer; shared
early so future forge CLIs reuse the same mixin.

**`@univocity-tools/git-options`** — mixable `--org`, `--repo`,
`--workflow`, and `--auth-kind` citty flags for GitHub-targeting commands.
Used by `fetch-release` and `fetch-run`.

**`@univocity-tools/github-api`** — GitHub REST client for releases and
workflow run artefacts. Token resolution via `gh auth token` or env vars;
used by Cart fetch commands.

**`@univocity-tools/create3-options`** — mixable `--create3-config`
citty flags and typed parse helpers for Arachnid/CREATE3 infra defaults.
Source of truth: repo-root `create3.jsonc`; build-time snapshot in
`src/defaults.ts` (ADR-0003).

**`@univocity-tools/subprocess`** — shared `Bun.spawn` helpers:
`runProcess` (capture stdout/stderr/exit code) and `runChecked` (log
stderr via `Out`, throw on failure). Use `runProcess` when stdout is
needed; `runChecked` for fire-and-forget commands (`tar`, `rsync`, etc.).

**`@univocity-tools/foundry-exec`** — `forge` and `cast` wrappers built on
`@univocity-tools/subprocess`, plus `--forge-bin` / `--cast-bin` resolution
and `requireForgeBin` / `requireCastBin` guards.

**`@univocity-tools/foundry-artefacts`** — foundry artefact format helpers.
Owns build-info **source hydration** (`hydrateSources`) for archive extract
and other consumers that materialize Solidity sources without forge.

**`@univocity-tools/deployer-common`** — companion package for the
`deployer` CLI (forge + create3 mixins, contracts checkout root). Also
hosts the deploy **propose / execute** model: shared signer flags
(`signer-options.ts`), the `Proposal` type (`proposal.ts`), bootstrap-key
resolution (`bootstrap-key.ts`, viem + WebCrypto), `ImutableUnivocity`
deployment data / CREATE2 prediction (`imutable-deploy-data.ts`), and a
viem-native Safe Transaction Service client (`safe-client.ts`).

Likely candidate: `@univocity-tools/safe-batch` (extract the Safe batch
JSON / `safe-client` types if a second tool needs them; ported from
[univocity/scripts/safe_propose_common.py](https://github.com/forestrie/univocity/blob/main/scripts/safe_propose_common.py)).
