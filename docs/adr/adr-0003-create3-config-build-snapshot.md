# Create3 config build-time snapshot

Deploy CLIs must ship stable Arachnid proxy and CREATE3 factory defaults
without requiring a **univocity tools repo** checkout or network access.
External consumers also need a documented, comment-friendly config file
in the repository.

We treat repo-root `create3.jsonc` as the single editable source. A
prebuild script generates committed
`packages/create3-options/src/defaults.ts`, which `bun build` inlines
into distributed binaries. At parse time, resolution order is:
`--create3-config`, `CREATE3_CONFIG`, discovered `create3.jsonc` at the
**tools repo root**, then embedded defaults.

Considered runtime-only file reads (rejected: breaks redistributed
binaries), hand-maintained TypeScript constants (rejected: drift from
`create3.jsonc`), and plain JSON imports (rejected: loses JSONC comments
and fragile monorepo paths).

Changing shipped defaults requires editing `create3.jsonc`, running
`bun run sync:create3`, and rebuilding apps. CI runs `check:create3` to
fail when the snapshot is stale.

See [ADR-0002](./adr-0002-contracts-checkout-root-discovery.md) for
eager synchronous path resolution at parse time.
