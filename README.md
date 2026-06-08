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
| `bun run build:binary` | Compile standalone binaries for the current platform |
| `bun run build:binary:linux-x64` | Cross-compile Linux x64 binaries (CI release) |
| `bun run sync:create3` | Regenerate embedded Create3 defaults from `create3.jsonc` |
| `bun run check:create3` | Fail if `defaults.ts` is stale vs `create3.jsonc` |

## Builder CLI

```bash
bun run --filter @univocity-tools/builder dev -- --help
bun run --filter @univocity-tools/builder dev -- --version
bun run --filter @univocity-tools/builder build
./apps/builder/dist/cli.js --help
```

## Deployer CLI

```bash
bun run --filter @univocity-tools/deployer dev -- --help
bun run --filter @univocity-tools/deployer dev -- config show
bun run --filter @univocity-tools/deployer build
./apps/deployer/dist/cli.js config show
```

## Standalone binaries

CI publishes **Linux x64** binaries on tagged releases (`v*`). On macOS,
build a native binary locally:

```bash
bun run build:binary
./apps/deployer/dist/deployer --help
./apps/builder/dist/builder --help
```

Explicit targets:

```bash
bun run --filter @univocity-tools/deployer build:binary:darwin-arm64
bun run build:binary:linux-x64   # same command CI uses for releases
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
