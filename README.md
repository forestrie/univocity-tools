# Univocity tools

TypeScript/Bun command-line tools for building, releasing, deploying, and
operating [Univocity](https://github.com/forestrie/univocity) smart
contracts.

Platform glossary: [devdocs/glossary.md](../devdocs/glossary.md). Tooling
terms: [CONTEXT.md](./CONTEXT.md).

## Setup

```bash
cd univocity-tools
mise install          # bun, doppler (for future deploy tasks)
bun install
```

## Commands

| Command | Purpose |
|---------|---------|
| `bun run typecheck` | Typecheck all workspace packages |
| `bun run check` | Prettier check |
| `bun run check:subprocess` | Enforce `Bun.spawn` policy in apps/packages |
| `bun run check:cli` | Enforce citty CLI policy in apps |
| `bun run format` | Prettier write |
| `bun test` | Run tests |
| `bun run build` | Build all `@univocity-tools/*` apps |

## Builder CLI

```bash
bun run --filter @univocity-tools/builder dev -- --help
bun run --filter @univocity-tools/builder dev -- --version
bun run --filter @univocity-tools/builder build
./apps/builder/dist/cli.js --help
```

## Layout

- `apps/` — runnable CLI tools (`builder` is the first)
- `packages/` — shared libraries (add when two apps need the same code)
- `docs/adr/` — repo-local decision records

Sibling repo: **univocity** (Foundry contracts). See
[docs/adr/adr-0001-typescript-tools-sibling-repo.md](./docs/adr/adr-0001-typescript-tools-sibling-repo.md).

## Secrets

Deploy-related tasks will use **Doppler** injected outside npm scripts
(`doppler run -- …`), consistent with the univocity contracts repo. Do
not commit `.env` files with secrets.

## Agents (Cursor, Claude Code, etc.)

Start with [AGENTS.md](./AGENTS.md).

- CLIs in `apps/` use **citty** — [docs/agents/cli.md](./docs/agents/cli.md)
- External processes use **`Bun.spawn`** —
  [docs/agents/subprocess.md](./docs/agents/subprocess.md)
