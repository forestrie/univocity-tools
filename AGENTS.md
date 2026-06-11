# AGENTS.md

Univocity-tools: Bun/TypeScript CLIs for Univocity contract build,
release, deploy, and ops. Human setup: [README.md](README.md). Tooling
glossary: [CONTEXT.md](CONTEXT.md). Platform glossary:
[devdocs/glossary.md](../devdocs/glossary.md).

Cursor and Claude Code: also read [.cursorrules](./.cursorrules) for
always-on rules.

## Layout

| Path | Purpose |
|------|---------|
| `apps/` | CLI tools (`contract-artefacts` / Cart first) |
| `packages/<app>/commoncli.ts` | Per-app shared citty flags + `define<App>Command` |
| `packages/<app>/options.ts` | Typed options + `parse*Options` from citty args |
| `packages/<app>/main.ts` | `run*(options)` — callable without CLI |
| `packages/cli-kit/` | Generic `mergeCommandArgs`, `defineAppCommand`, `evaluateOptionValue` |
| `packages/` | Other shared libraries (multi-app) |
| `docs/adr/` | Repo-local ADRs |
| `docs/agents/` | On-demand agent guides |

Sibling repo: **univocity** (Foundry, `forge`, Python deploy scripts).

## Repository rules (always apply)

- **CLIs:** Tools in `apps/` use **[citty](https://github.com/unjs/citty)**
  with **parse/execute split**: citty wiring in `apps/`, typed
  `parse*` in `packages/<app>/options.ts`, `run*` in
  `packages/<app>/main.ts`. See [docs/agents/cli.md](docs/agents/cli.md).
- **Option value sources:** Call **`evaluateOptionValue`** from cli-kit as
  the first step when parsing string CLI options (unless explicitly opted
  out). See [docs/agents/cli.md](docs/agents/cli.md#option-value-sources).
- **Subprocesses:** Use **`Bun.spawn`** in `packages/<app>/main.ts` (not in
  citty `run`). See [docs/agents/subprocess.md](docs/agents/subprocess.md).
- **Cursor:** [.cursor/rules/citty-cli.mdc](.cursor/rules/citty-cli.mdc),
  [.cursor/rules/cli-command-structure.mdc](.cursor/rules/cli-command-structure.mdc),
  [.cursor/rules/bun-spawn-subprocess.mdc](.cursor/rules/bun-spawn-subprocess.mdc),
  [.cursor/rules/commit-conventions.mdc](.cursor/rules/commit-conventions.mdc)

## Commands

- **Install**: `bun install` (after `mise install` for pinned bun)
- **Typecheck**: `bun run typecheck`
- **Test**: `bun test`
- **Format**: `bun run check`; `bun run format`
- **Subprocess policy**: `bun run check:subprocess`
- **CLI policy**: `bun run check:cli`
- **Build apps**: `bun run build`
- **Build binaries (local)**: `bun run build:binary`
- **Build binaries (Linux x64)**: `bun run build:binary:linux-x64`
- **Cart dev**: `bun run --filter @univocity-tools/contract-artefacts dev -- --help`

## Gotchas (critical)

- Do not duplicate platform terms in `CONTEXT.md` — link devdocs glossary.
- No package `lint` script — use `bun run check` + typecheck +
  `check:subprocess`.
- Future deploy tasks: inject secrets via **Doppler outside** npm
  scripts (no repo-root `.env` with secrets).
- Cross-repo work needs explicit paths (e.g. `UNIVOCITY_ROOT` to contracts
  checkout); see ADR-0001.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)
  — title ≤100 chars, body lines ≤72; see
  [.cursor/rules/commit-conventions.mdc](.cursor/rules/commit-conventions.mdc).

## Documentation map

- **Agent index**: [docs/agents/README.md](docs/agents/README.md)
- **Conventions**: [docs/agents/conventions.md](docs/agents/conventions.md)
- **CLIs (citty)**: [docs/agents/cli.md](docs/agents/cli.md)
- **Subprocesses**: [docs/agents/subprocess.md](docs/agents/subprocess.md)
- **ADR-0001**: [docs/adr/adr-0001-typescript-tools-sibling-repo.md](docs/adr/adr-0001-typescript-tools-sibling-repo.md)
- **ADR-0003**: [docs/adr/adr-0003-create3-config-build-snapshot.md](docs/adr/adr-0003-create3-config-build-snapshot.md)
- **Platform**: [../devdocs/](../devdocs/)
