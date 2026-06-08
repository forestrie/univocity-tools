# Code conventions (univocity-tools)

## Runtime

- **Bun** only — no Node compatibility shims in `apps/` or `packages/`.
- **TypeScript** strict; extend root [tsconfig.base.json](../../tsconfig.base.json).

## CLIs

Tools in **`apps/`** use **[citty](https://github.com/unjs/citty)** for
commands and nested subcommands. Shared flags per app:
**`packages/<app>/commoncli.ts`** + **`define<App>Command`**. Parse/execute
split: **`options.ts`** + **`main.ts`**. See [cli.md](cli.md).

## Subprocesses

**`Bun.spawn` only** in `apps/` and `packages/`. See
[subprocess.md](subprocess.md).

## Layout

- `apps/<name>/` — one CLI tool per directory; `src/cli.ts` entry.
- `packages/<name>/commoncli.ts` — companion package for that app’s CLI
  flags and merge helpers; may compose **option mixins** (forge-options).
- `packages/<name>/options.ts` — typed options + `parse*Options`.
- `packages/<name>/main.ts` — `run*(options)` implementations.
- `packages/cli-kit/` — generic citty merge helpers (not app-specific).
- `packages/<other>/` — shared libraries when **two or more** apps need
  the same code ([packages/README.md](../../packages/README.md)).

## Formatting and checks

- Prettier: `bun run check` / `bun run format`
- Types: `bun run typecheck`
- Tests: `bun test`
- Subprocess imports: `bun run check:subprocess`
- CLI frameworks: `bun run check:cli`

## Commits

Use **[Conventional Commits](https://www.conventionalcommits.org/)** for every
commit: `type(scope): subject` title (≤100 characters), blank line, then
body lines ≤72 characters. Never add `Co-Authored-By` lines.

Full rules: [.cursor/rules/commit-conventions.mdc](../../.cursor/rules/commit-conventions.mdc).
