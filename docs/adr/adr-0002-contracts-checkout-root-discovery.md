# Contracts checkout root discovery

ADR-0001 accepts explicit cross-repo paths such as `UNIVOCITY_ROOT`. The
`contract-artefacts` tool also needs sensible defaults when developers run commands
from sibling checkouts without exporting env vars every time.

We resolve the **contracts checkout root** eagerly at parse time to an
absolute path. Order: explicit `--univocity-root` / `UNIVOCITY_ROOT`
(relative values resolved against cwd), then a sync walk upward for a
`.git` directory whose parent folder is named `univocity`, then absolute
cwd as fallback. Relative `--forge-config` (default `foundry.toml`) always
resolves against that root so later cwd changes cannot alter paths.

Considered `git rev-parse` (rejected: subprocess and async parse) and
lazy resolve at spawn time (rejected: cwd drift during command bodies).

See [ADR-0001](./adr-0001-typescript-tools-sibling-repo.md).
