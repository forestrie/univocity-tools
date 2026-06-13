# CLI conventions (citty)

All command-line tools under **`apps/`** are built with
**[citty](https://github.com/unjs/citty)** ([UnJS](https://unjs.io/)).

Do not hand-roll `process.argv` parsing, and do not add alternate CLI
frameworks (`commander`, `yargs`, `clipanion`, `cac`, etc.).

## Command structure (parse vs execute)

Separate **argument processing** from **command behavior**:

```text
apps/<name>/src/cli.ts          → runMain(command)
apps/<name>/src/command.ts      → citty root + subCommands
apps/<name>/src/commands/**     → thin citty modules (schema + run wiring)

packages/<name>/commoncli.ts    → commonArgs, define<App>Command
packages/<name>/options.ts      → <Command>Options types, parse* functions
packages/<name>/main.ts         → run*(options) — callable without citty
```

| Layer                   | Must                                            | Must not                               |
| ----------------------- | ----------------------------------------------- | -------------------------------------- |
| `apps/…/commands/*.ts`  | Declare citty `args`; call `parse*` then `run*` | `Bun.spawn`, business logic, heavy I/O |
| `packages/…/options.ts` | Map `ParsedArgs` → typed options                | Side effects                           |
| `packages/…/main.ts`    | Accept typed options; implement behavior        | citty imports, `process.argv`          |

Other apps and unit tests call **`run*`** from `@univocity-tools/<name>-common/main`
with a typed options object — no CLI required.

Use **`defineCommandRunner(parse, execute)`** from `@univocity-tools/<name>-common`
(re-exported from cli-kit) in citty `run` handlers.

## Layout

Each app in `apps/<name>/`:

| Path             | Role                                      |
| ---------------- | ----------------------------------------- |
| `src/cli.ts`     | Entry: `runMain(command)`                 |
| `src/command.ts` | Root citty command (`define<App>Command`) |
| `src/commands/`  | Subcommand modules — parsing wiring only  |

Each app has a **companion package** `@univocity-tools/<name>-common`:

| Path           | Role                                                                |
| -------------- | ------------------------------------------------------------------- |
| `commoncli.ts` | `commonArgs`, `define<App>Command`, re-export `defineCommandRunner` |
| `options.ts`   | Per-command `*Options` types and `parse*Options(args)`              |
| `main.ts`      | Per-command `run*(options: *Options)` implementations               |

Shared merge helpers: **`@univocity-tools/cli-kit`**.

### Why merge on every command?

citty does **not** pass parent flags into subcommand `run({ args })`.
Merge `commonArgs` on **every** command via `define<App>Command`. See
existing section below.

Put **positionals only** on the leaf command that uses them.

## Option value sources

`@univocity-tools/cli-kit` provides **`evaluateOptionValue`** for resolving
named option value sources **before** any other parse processing (path
resolution, implicit env fallbacks, file loading, etc.).

Call it as the **first step** for every string option value in `parse*`
functions unless a command explicitly opts out.

```typescript
import { evaluateOptionValue } from "@univocity-tools/cli-kit";

const raw = evaluateOptionValue(
  "forge-config",
  args.forgeConfig ?? args["forge-config"],
);
// then existing helpers, e.g. resolveForgeConfigPath(raw, univocityRoot)
```

Helpers: **`optionNameToEnvVar`** (`forge-config` → `FORGE_CONFIG`),
**`readEvaluatedStringOption`** (kebab/camel arg lookup + evaluate).

### Syntax (whole-value templates only)

| Value                     | Resolves to                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `${env:VAR}`              | `process.env.VAR`                                                                                             |
| `${env}`                  | `process.env.<OPTION_ENV>` where option env is derived from the flag name (`--forge-config` → `FORGE_CONFIG`) |
| `\${env}` / `\${env:VAR}` | Literal `${env}` / `${env:VAR}` (backslash escapes evaluation)                                                |
| Any other string          | Unchanged                                                                                                     |

If the referenced environment variable is unset or empty,
`evaluateOptionValue` returns **`undefined`** so existing downstream
fallbacks still apply (for example `CREATE3_CONFIG`, `RPC_URL`, citty
defaults, discovery).

Example: `--forge-config '${env:MY_CONFIG}'` reads `MY_CONFIG` from the
environment, then `resolveForgeConfigPath` resolves the result against
`univocityRoot` as usual.

## Option mixins

Reusable flag sets live in cross-app packages (for example
**`@univocity-tools/forge-options`**) and merge into an app's
`commonArgs`. Each mixin exports citty `args` and `parse*` helpers.

Cart always merges **forge options** (`--forge-config`, default
`foundry.toml`). Parsed options include:

| Field                                        | Meaning                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `univocityRoot`                              | Absolute **contracts checkout root** (see ADR-0002)                                                              |
| `workDir`                                    | Absolute **work dir** (`--work-dir`, default `.work` under `univocityRoot`)                                      |
| `forgeConfig`                                | Absolute **forge config path** (`foundry.toml` or override)                                                      |
| `buildRoot`                                  | Absolute **build root** (`--build-root`, default: the forge config dir)                                          |
| `outDir` / `srcDir` / `cacheDir` / `libsDir` | Forge artifact dirs (`--foundry-out/src/cache/libs`, defaults `out`/`src`/`cache`/`lib`) relative to `buildRoot` |

Relative `--forge-config` resolves against `univocityRoot`. The artifact
dirs resolve against `buildRoot` (no `foundry.toml` parsing). When spawning
forge, pass `--config-path` with `options.forgeConfig` — not `--forge-config`.

`--source-root` and `--work-dir` are the tool-wide **common options**
(`commonOptionArgs` / `parseCommonOptions` in `@univocity-tools/cli-kit`),
spread into both Cart and deployer `commonArgs`. Parsed app options
map cli-kit `sourceRoot` to `univocityRoot` (the **contracts checkout
root**); Cart and deployer pass `gitRepoName: "univocity"` for git
discovery.

Deployer merges **create3 options** (`--create3-config`, no citty
default path). Parsed options include:

| Field     | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| `create3` | Resolved **Create3 config** (proxy, deploy-tx, signer, factory) |

Resolution order at parse time:

1. `--create3-config` / `create3Config`
2. `CREATE3_CONFIG` env
3. Discovered repo-root `create3.jsonc` when cwd is under a git checkout
   named `univocity-tools`
4. **Embedded Create3 defaults** from generated `defaults.ts` (see
   ADR-0003)

Do not put a filesystem path in the citty `default:` for `--create3-config`;
omitting the flag uses embedded stable values (or discovery in a checkout).

### Output and verbosity

`@univocity-tools/cli-kit/reporting` centralizes CLI output. Merge
**`verbosityArgs`** into each app's `commonArgs` (deployer and Cart already
do). **`defineCommandRunner`** resolves verbosity from citty args, builds an
**`Out`** instance, and passes it as the **first** argument to every
`run*(out, options)` handler.

| Method         | Stream | Shown when                |
| -------------- | ------ | ------------------------- |
| `out.out(…)`   | stdout | always (pipeable content) |
| `out.print(…)` | stderr | verbosity ≥ 0             |
| `out.warn(…)`  | stderr | verbosity ≥ 0             |
| `out.log(…)`   | stderr | verbosity > 2 (trace)     |

**`--verbosity` / `-v`:** default `0`. `-1` silences stderr feedback
(`.print`, `.warn`, `.log`); stdout `.out()` still works. Repeat standalone
`-v` flags: level = `max(0, count - 1)`. Explicit `-v N` / `--verbosity N`
wins over repeat counting.

Do not use raw `console.log` / `console.error` in `packages/<app>/main.ts`.
Pass **`Out`** into subprocess helpers (for example `FoundryExecContext.out`).

### Source root resolution (cli-kit)

`resolveSourceGitRootEager` lives in `@univocity-tools/cli-kit`
(wrapped by `parseCommonOptions`). At parse time, in order:

1. `--source-root` / `SOURCE_ROOT` → `path.resolve(cwd, value)`
2. When the caller passes `gitRepoName` (Cart and deployer use
   `"univocity"`): git walk for a `.git` ancestor with that folder name
3. Fallback → absolute `process.cwd()`

`--work-dir` (default `.work`) resolves against the resolved source root.
App `parse*` functions map `sourceRoot` → `univocityRoot`. Direct API
callers must supply absolute `univocityRoot`, `workDir`, and `forgeConfig`;
discovery runs only in `parse*` functions.

## Example: root + nested command

```typescript
// apps/contract-artefacts/src/command.ts
import { defineCartCommand } from "@univocity-tools/contract-artefacts-common";

export default defineCartCommand({
  meta: { name: "contract-artefacts", version: "0.1.0", description: "…" },
  subCommands: {
    validate: () => import("./commands/validate.js").then((m) => m.default),
  },
});
```

```typescript
// apps/contract-artefacts/src/commands/validate/batch.ts  — citty only
import {
  defineCartCommand,
  defineCommandRunner,
} from "@univocity-tools/contract-artefacts-common";
import { runValidateBatch } from "@univocity-tools/contract-artefacts-common/main";
import { parseValidateBatchOptions } from "@univocity-tools/contract-artefacts-common/options";

export default defineCartCommand({
  meta: { name: "batch", description: "Validate Safe batch JSON" },
  args: {
    path: { type: "positional", description: "Batch file", required: true },
  },
  run: defineCommandRunner(parseValidateBatchOptions, runValidateBatch),
});
```

```typescript
// packages/contract-artefacts/options.ts
export type ValidateBatchOptions = CartCommonOptions & { path: string };

export function parseValidateBatchOptions(
  args: ParsedArgs<ValidateBatchArgsDef>,
): ValidateBatchOptions {
  return { ...parseCartCommonOptions(args), path: args.path! };
}
```

```typescript
// packages/contract-artefacts/main.ts — no citty
import type { Out } from "@univocity-tools/cli-kit/reporting";

export async function runValidateBatch(
  out: Out,
  options: ValidateBatchOptions,
): Promise<void> {
  out.log("validate batch: %s", options.path);
  /* Bun.spawn, validators, etc. */
}
```

```typescript
// Another app or test — direct call (absolute paths)
import { createOut } from "@univocity-tools/cli-kit/reporting";
import { runValidateBatch } from "@univocity-tools/contract-artefacts-common/main";

await runValidateBatch(createOut(0), {
  path: "/abs/batch.json",
  univocityRoot: "/abs/univocity",
  forgeConfig: "/abs/univocity/foundry.toml",
});
```

```typescript
// apps/contract-artefacts/src/cli.ts
import command from "./command.js";
import { runMain } from "citty";

runMain(command);
```

## Adding a new command

1. Add `*Options` + `parse*Options` in `packages/<app>/options.ts`.
2. Add `run*` in `packages/<app>/main.ts`.
3. Add citty module under `apps/<app>/src/commands/` with
   `defineCommandRunner(parse, run)`.
4. Register in parent `subCommands` (lazy import).

## Adding a new CLI app

1. Create `apps/<name>/` (`cli.ts`, `command.ts`, `commands/`).
2. Create `packages/<name>/` with `commoncli.ts`, `options.ts`, `main.ts`.
3. Export subpaths in `package.json`: `./commoncli`, `./options`, `./main`.
4. App depends on `@univocity-tools/<name>-common` only (not cli-kit).

## Args and help

- Declare args on each command with citty’s `args` schema.
- Rely on citty for `--help`, usage text, and subcommand routing.
- Use `meta.alias` for shortcuts; `meta.hidden: true` for internal commands.

## Subprocesses

Implement **`Bun.spawn`** only in `packages/<app>/main.ts` — see
[subprocess.md](subprocess.md).

## Forbidden in `apps/`

| Do not use                    | Use instead                   |
| ----------------------------- | ----------------------------- |
| Business logic in citty `run` | `packages/<app>/main.ts`      |
| Manual `process.argv` loops   | citty + `defineCommandRunner` |
| Duplicated global flags       | `packages/<app>/commoncli.ts` |
| `commander`, `yargs`, etc.    | citty                         |

## Dependencies

- **`citty`** on each app.
- **`@univocity-tools/cli-kit`** on each companion package only.
- **`@univocity-tools/forge-options`** on apps that merge forge flags
  (Cart via `@univocity-tools/contract-artefacts-common`).
- **`@univocity-tools/git-options`** on apps that merge GitHub targeting flags
  (Cart fetch commands via `@univocity-tools/contract-artefacts-common`).
- **`@univocity-tools/github-api`** on packages that call the GitHub REST API
  (Cart fetch commands via `@univocity-tools/contract-artefacts-common`).
- **`@univocity-tools/create3-options`** on apps that merge create3 flags
  (deployer via `@univocity-tools/deployer-common`).
- **`@univocity-tools/foundry-exec`** on apps that spawn forge/cast
  (deployer, Cart).
- App → **`@univocity-tools/<name>-common`** (parse/run via subpath exports).

## Contract-artefacts commands (Cart)

```text
contract-artefacts
├── archive                # Package forge build outputs into a tar.gz
├── archive-extract        # Extract a build archive and hydrate sources
│   [archive]              #   archive path relative to --work-dir
├── archive-validate       # Validate a release root against forge build tree
├── fetch-release          # Fetch build archives from a GitHub release
├── fetch-run              # Fetch build archives from a workflow run
├── release-id             # Derive the release id (version+build-id) from git
└── validate
    └── batch [path]       # Validate a Safe batch JSON file
```

### Archive (build archive)

`contract-artefacts archive` packages an already-completed `forge build` into a
**build archive** (`tar.gz`) so downstream consumers deploy, verify, and
generate bindings without the foundry toolchain (see
[ADR-0006](../adr/adr-0006-build-archive-decouples-deploy.md)).

- Stages `<workDir>/build/out` from the forge `outDir`
  (`rsync -a --delete`, includes `out/build-info`) and copies
  `<cacheDir>/solidity-files-cache.json` to `<workDir>/build/cache`.
- Tars `<workDir>/build` to `<workDir>/<archive-name>.tar.gz`
  (`--archive-name`, default `build`); the archive path is written to
  stdout via `out.out`.
- `--release-id` appends a **release id** to the base name
  (`<archive-name>-<release-id>`): pass an explicit value, or an empty
  value to derive it from git like `release-id`.
- Never invokes forge; errors if `out/` or `solidity-files-cache.json` is
  missing ("run forge build first"). Sources are not shipped — materialize
  them from `solidity-files-cache.json` + `out/build-info`.
- CI builds each `foundry.toml` project independently and distinguishes
  the archives by `--archive-name`.

### Archive extract

`contract-artefacts archive-extract` unpacks a **build archive** into a **release
root** and performs **source hydration** from `out/build-info` (see
[ADR-0006](../adr/adr-0006-build-archive-decouples-deploy.md)).

- Positional `archive` — path to the tarball, relative to `--work-dir`.
- `--release-root` (default `${env:RELEASE_ROOT}`, else cwd) — extract
  and hydrate target; written to stdout via `out.out`.
- Extracts with `tar --strip-components=1` so `out/` and `cache/` land
  directly under the release root (matches `RELEASE_ROOT/out/` layout).
- Hydration logic lives in `@univocity-tools/foundry-artefacts`
  (`hydrateSources`); skips existing source paths; warns on malformed
  build-info JSON.
- Never invokes forge; errors if the archive file is missing.

### Archive validate

`contract-artefacts archive-validate` checks a **release root** after
**archive extract** against the forge build tree in the **contracts checkout**
(see [ADR-0006](../adr/adr-0006-build-archive-decouples-deploy.md)).

- Assumes `archive-extract` has already run; does not read the tarball.
- `--release-root` (default `${env:RELEASE_ROOT}`, else cwd) — directory to
  validate; written to stdout via `out.out` on success.
- Uses forge mixin flags (`--source-root`, `--forge-config`, etc.) to locate
  the reference `outDir` and `cacheDir` in the contracts checkout.
- Compares `<releaseRoot>/out/` to the reference `out/` (`diff -rq`), byte-
  compares `cache/solidity-files-cache.json`, and checks each hydrated source
  path from `out/build-info` matches the checkout.

### Release id

`contract-artefacts release-id` derives the **release id** from the contracts
checkout's git tags and HEAD (see
[ADR-0007](../adr/adr-0007-release-id-format.md)).

- Selects the most recent semver-shaped tag (`git tag --sort=-creatordate`,
  optional leading `v`) as the **release tag**; falls back to `v0.0.0`.
- `--next-major` / `--next-minor` / `--next-patch` bump the version (resetting
  lower levels); `--next` aliases `--next-minor`; the flags are mutually
  exclusive.
- Appends a **build id** `YYMMDD-<short-commit>` (current UTC date +
  `git rev-parse --short HEAD`) to produce `v0.1.1+260612-<hash>`, written to
  stdout via `out.out`.
- `--semver` prints only the release tag (no build id).
- Errors when `--source-root` is not a git repository (parse-time discovery
  otherwise falls back to the working directory).

### Fetch release

`contract-artefacts fetch-release` downloads contract build archives from a
GitHub release (see
[ADR-0008](../adr/adr-0008-fetch-release-and-run.md)).

- `--org` / `--repo` (defaults `forestrie` / `univocity`) select the target
  repository.
- `--release <tag>` fetches a specific release; omit for the latest release.
- `--artefact` filters by base name or full file name; omit to fetch all
  `.tar.gz` assets (ignores "Source code" archives and checksum sidecars).
- Saves each file to `workDir/<base>/<full-name>` and prints each path on
  stdout.
- `--auth-kind gh-cli` (default) uses `gh auth token`; `env` reads
  `GITHUB_TOKEN` / `GH_TOKEN`.

### Fetch run

`contract-artefacts fetch-run` downloads contract build archives produced by a
workflow run (see
[ADR-0008](../adr/adr-0008-fetch-release-and-run.md)).

- `--workflow` (default `release.yml`) selects the workflow file.
- `--run-id` fetches a specific run; omit for the latest successful run.
- `--branch` optionally filters the latest-run lookup.
- `--artefact` filters by workflow artefact name, base name, or full tarball
  name inside the artefact zip; omit to fetch all.
- Saves each tarball to `workDir/<base>/<full-name>` and prints each path on
  stdout.
- Primary use case: `release.yml` on a branch (workflow artefacts uploaded per
  archive base).

## Deployer commands

```text
deployer
├── config
│   └── show
└── deploy
    ├── create3                # Deploy shared CREATE3 factory via Arachnid
    ├── propose
    │   └── imutable           # Build a deploy-imutable proposal (EOA or Safe)
    ├── approve [proposalFile] # Sign + execute a Safe proposal; stdin if no file
    └── execute [proposalFile] # Broadcast a local proposal (cast send); stdin if no file
```

### Propose / approve / execute model

`deploy propose imutable`, `deploy approve`, and `deploy execute` split
deployment into a **proposal** step and a path-specific **execution**
step so the local (non-interactive) and Gnosis Safe multisig flows share
one implementation.

- **propose imutable** builds the `ImutableUnivocity` deployment data
  (`forge build` → creation code + `abi.encode(int64 bootstrapAlg, bytes
bootstrapKey)`), then emits a deployer-native proposal JSON
  (`kind: "deploy-imutable"`).
  - Without `--safe-publish`: `publishMode: "eoa"`, one contract-create
    transaction (`to: null`); the proposal is pipeable to `deploy execute`.
  - With `--safe-publish`: `publishMode: "safe"`, a
    `CreateCall.performCreate2` transaction; the SafeTx is signed with
    `--deploy-key` and POSTed to the Safe Transaction Service.
- **approve** reads a `safe` proposal (file or stdin), refuses `eoa`
  proposals, verifies the resolved signer is a Safe owner, POSTs the
  owner confirmation to the Transaction Service, and by default executes
  on-chain via Safe `execTransaction`. Use `--confirm-only` to post the
  signature only.
- **execute** reads an `eoa` proposal (file or stdin), refuses `safe`
  proposals (route those through **approve**), asserts the resolved
  signer matches the proposal `from`, and broadcasts each transaction
  with `cast send` (`--create` for contract-creates).

Signer resolution (shared deploy-suite flags):

| Flag (env)                            | propose                                                               | approve                 | execute                 |
| ------------------------------------- | --------------------------------------------------------------------- | ----------------------- | ----------------------- |
| `--owner-address` (`OWNER_ADDRESS`)   | proposal `from` (wins)                                                | —                       | —                       |
| `--deploy-key` (`DEPLOY_KEY`)         | derives `from` (pre-empts `--deploy-address`); signs `--safe-publish` | signing key (fallback)  | signing key (fallback)  |
| `--deploy-address` (`DEPLOY_ADDRESS`) | `from` fallback                                                       | —                       | —                       |
| `--owner-signer` (`OWNER_SIGNER`)     | —                                                                     | signing key (preferred) | signing key (preferred) |

Additional **approve** flags: `--rpc-url` (`RPC_URL`, required),
`--safe-tx-service-url` (`SAFE_TX_SERVICE_URL`),
`--safe-tx-hash` (`SAFE_TX_HASH`), `--confirm-only`.

Bootstrap crypto is ported to TypeScript (viem + WebCrypto), so the deploy
step no longer needs the Solidity deploy/batch scripts; `forge` is used only
for the build and `cast` only for chain I/O.
