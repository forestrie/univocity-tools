# Shared packages

## App companion packages (`packages/<app-name>/`)

Every CLI in `apps/<name>/` has a matching companion package:

```text
apps/builder/src/cli.ts           → runMain
apps/builder/src/command.ts       → citty tree
apps/builder/src/commands/**      → thin parse + wire to run*

packages/builder/commoncli.ts     → commonArgs, defineBuilderCommand
packages/builder/options.ts       → ValidateBatchOptions, parseValidateBatchOptions
packages/builder/main.ts          → runValidateBatch(options)
```

See [docs/agents/cli.md](../docs/agents/cli.md).

Generic helpers: **`@univocity-tools/cli-kit`**
(`mergeCommandArgs`, `defineCommandRunner`).

## Cross-app packages

Add a package under `packages/` (other than `<app-name>/`) when **two
or more tools** need the same types, validation, or client logic.

**`@univocity-tools/forge-options`** — mixable `--forge-config` citty
flags and typed parse helpers. Builder is the first consumer; shared
early so future forge CLIs reuse the same mixin.

**`@univocity-tools/create3-options`** — mixable `--create3-config`
citty flags and typed parse helpers for Arachnid/CREATE3 infra defaults.
Source of truth: repo-root `create3.jsonc`; build-time snapshot in
`src/defaults.ts` (ADR-0003).

**`@univocity-tools/foundry-exec`** — `Bun.spawn` wrappers for `forge` and
`cast`, plus `--forge-bin` / `--cast-bin` resolution and
`requireForgeBin` / `requireCastBin` guards.

**`@univocity-tools/deployer-common`** — companion package for the
`deployer` CLI (forge + create3 mixins, contracts checkout root).

Likely candidate: `@univocity-tools/safe-batch` (Safe batch JSON types
and validation ported from
[univocity/scripts/safe_propose_common.py](https://github.com/forestrie/univocity/blob/main/scripts/safe_propose_common.py)).
