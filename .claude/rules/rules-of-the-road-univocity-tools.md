# Rules of the road — univocity-tools (Bun CLIs)

Bun/TypeScript CLIs for contract build, release, deploy, ops (Cart, deploy-web).
Load with [platform.md](https://github.com/forestrie/forestrie-agents/blob/main/rules-of-the-road/platform.md). `⤷` = specialises a platform rule.

Glossary/links: [`arc-tools` skill](https://github.com/forestrie/forestrie-agents/blob/main/arc-context/arc-tools/SKILL.md).

---

### T1 — citty + parse/execute split
citty is the required CLI framework for everything under `apps/`; keep the split
— citty command in `apps/`, `parse*` in `packages/*/options.ts`, `run*` in
`main.ts`. **Why:** it keeps argument parsing testable and separate from
side-effecting execution, the repo's core CLI contract.
[docs/agents/cli.md](https://github.com/forestrie/univocity-tools/blob/main/docs/agents/cli.md).

### T2 — One verb per authority
Each authority is its own verb (`deploy`, `create-log`, `register-grant`,
`delegate`); do NOT collapse authorities into flag combinations. **Why:**
least-privilege must be legible — grant flags follow from the verb, so a caller
cannot accidentally over-authorise via a flag mix.
[ADR-0052](https://github.com/forestrie/devdocs/blob/main/archive/2607/adr/adr-0052-cli-authority-taxonomy.md).

### T3 — Zero-config signing is COSE-native and key-derived
Default signing produces registration-free, key-derived identity (hex `kid`
ES256 / CAIP-10 KS256) — no certificate or registration dependency. **Why:** the
CLI must emit SCITT-compliant statements offline with no setup.
⤷ specialises P11. [ADR-0055](https://github.com/forestrie/devdocs/blob/main/archive/2607/adr/adr-0055-statement-issuer-subject-identity.md).

### T4 — Subprocess/forge exec goes through the documented policy
Shell out only via the sanctioned subprocess policy (`Bun.spawn`, `doppler run`
**outside** npm scripts, `UNIVOCITY_ROOT` for cross-repo forge); `check:subprocess`
enforces it. **Why:** ad-hoc shelling leaks secrets and breaks the cross-repo
forge contract.
[docs/agents/subprocess.md](https://github.com/forestrie/univocity-tools/blob/main/docs/agents/subprocess.md).

### T5 — deploy-web stays a neutral, EOA-only thin shell
No Safe/console/deploy-orchestration logic belongs in deploy-web — it is the
neutral shell narrowed by ADR-0060. **Why:** the neutral deploy path must stay
provider-agnostic; Safe logic lives in mandate + deploy-core.
[ADR-0060](https://github.com/forestrie/devdocs/blob/main/archive/2607/adr/adr-0060-inline-safe-deploy-in-mandate-console.md).

### T6 — Consume published packages, not source symlinks
Shared deploy logic lives in the published `@forestrie/deploy-core`; tools depend
on the published package (exact/transitive pins), never source symlinks.
**Why:** neutrality and reproducibility — a source symlink hides which version a
deploy actually ran.
[ADR-0060](https://github.com/forestrie/devdocs/blob/main/archive/2607/adr/adr-0060-inline-safe-deploy-in-mandate-console.md).
