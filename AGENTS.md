# AGENTS.md

Univocity-tools: Bun/TypeScript CLIs for Univocity contract build,
release, deploy, and ops. Human setup: [README.md](README.md). Tooling
glossary: [CONTEXT.md](CONTEXT.md). Platform glossary:
[devdocs/glossary.md](../devdocs/glossary.md).

## Layout

| Path | Purpose |
|------|---------|
| `apps/` | CLI tools (`builder` first) |
| `packages/` | Shared code for multiple apps |
| `docs/adr/` | Repo-local ADRs |

Sibling repo: **univocity** (Foundry, `forge`, Python deploy scripts).

## Commands

- **Install**: `bun install` (after `mise install` for pinned bun)
- **Typecheck**: `bun run typecheck`
- **Test**: `bun test`
- **Format**: `bun run check`; `bun run format`
- **Build apps**: `bun run build`
- **Builder dev**: `bun run --filter @univocity-tools/builder dev -- --help`

## Gotchas (critical)

- Do not duplicate platform terms in `CONTEXT.md` — link devdocs glossary.
- No package `lint` script — use `bun run check` + typecheck.
- Future deploy tasks: inject secrets via **Doppler outside** npm
  scripts (no repo-root `.env` with secrets).
- Cross-repo work needs explicit paths (e.g. `UNIVOCITY_ROOT` to contracts
  checkout); see ADR-0001.

## Documentation map

- **Agent index**: [docs/agents/README.md](docs/agents/README.md)
- **ADR-0001**: [docs/adr/adr-0001-typescript-tools-sibling-repo.md](docs/adr/adr-0001-typescript-tools-sibling-repo.md)
- **Platform**: [../devdocs/](../devdocs/)
