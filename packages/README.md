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

Likely candidate: `@univocity-tools/safe-batch` (Safe batch JSON types
and validation ported from
[univocity/scripts/safe_propose_common.py](https://github.com/forestrie/univocity/blob/main/scripts/safe_propose_common.py)).
