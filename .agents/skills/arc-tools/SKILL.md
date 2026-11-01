---
name: arc-tools
description: univocity-tools domain glossary. Use when a task touches Cart, contract-artefacts, or the deploy CLIs (Bun/citty).
when_to_use: "Cart, contract-artefacts, citty CLI, Bun.spawn, forge exec, deploy-web, CREATE3 config."
user-invocable: false
---

# arc-context: tools (univocity-tools)

Minimal glossary for **univocity-tools** — Bun/TypeScript CLIs for contract
build, release, deploy, and ops.

**Load when:** Cart, contract-artefacts, citty CLI, `Bun.spawn`, forge exec,
deploy-web, CREATE3 config.

**Do not bulk-read** — use [univocity-tools/AGENTS.md](https://github.com/forestrie/univocity-tools/blob/main/AGENTS.md).

---

## Core terms

| Term | Meaning |
|------|---------|
| **Cart** | `@univocity-tools/contract-artefacts` CLI app |
| **citty** | Required CLI framework for all apps under `apps/` |
| **parse/execute split** | citty in `apps/`; `parse*` in `packages/*/options.ts`; `run*` in `main.ts` |
| **evaluateOptionValue** | cli-kit env interpolation for string flags |
| **UNIVOCITY_ROOT** | Absolute path to contracts checkout for cross-repo forge |
| **deploy-web** | Web UI for deploy flows (Privy testing token in dev) |

## Authoritative docs

| Topic | Path |
|-------|------|
| Agent router | [AGENTS.md](https://github.com/forestrie/univocity-tools/blob/main/AGENTS.md) |
| CLI patterns | [docs/agents/cli.md](https://github.com/forestrie/univocity-tools/blob/main/docs/agents/cli.md) |
| Subprocess policy | [docs/agents/subprocess.md](https://github.com/forestrie/univocity-tools/blob/main/docs/agents/subprocess.md) |
| Deploy e2e tiers | [docs/agents/e2e-deploy.md](https://github.com/forestrie/univocity-tools/blob/main/docs/agents/e2e-deploy.md) |
| Sibling repo ADR | [ADR-0001](https://github.com/forestrie/univocity-tools/blob/main/docs/adr/adr-0001-typescript-tools-sibling-repo.md) |

## Commands (repo root)

- `bun install` / `bun run typecheck` / `bun test`
- `bun run check:cli` / `bun run check:subprocess` — policy enforcement
- Deploy with secrets: `doppler run -- task …` outside npm scripts

## Sibling repos

| Repo | Role |
|------|------|
| univocity | Foundry source of truth for contracts |
| devdocs | Platform glossary and cross-repo ADRs |
