# Build archive decouples deploy and verify from the contracts repo

[ADR-0004](./adr-0004-deploy-propose-execute-model.md) made `forge` a pure
build step for deploys, but producing deploy/verify inputs still required a
foundry toolchain where they are consumed. We want contract projects to build
with native `forge build` and everything downstream — deploy, verify, code
bindings — to run without foundry.

`contract-artefacts archive` packages a completed build into a portable **build archive**
(`tar.gz`): it mirrors the forge `out/` tree (which includes `out/build-info`)
into `<workDir>/build/out` and copies `cache/solidity-files-cache.json` into
`<workDir>/build/cache`, then tars `<workDir>/build`. `--archive-name`
(default `build`) names the tarball; CI builds each `foundry.toml` project
independently and distinguishes archives by name. Copies use rsync-like
semantics (`rsync -a --delete`); `archive` never invokes forge and errors if
`out/` or `solidity-files-cache.json` is missing.

Sources are deliberately not shipped: a consumer can materialize them from
`solidity-files-cache.json` and `out/build-info`, keeping the archive minimal.
`--build-root` (default: the **forge config path** directory) and
`--foundry-out` / `--foundry-src` / `--foundry-cache` / `--foundry-libs`
locate the inputs without parsing `foundry.toml`. `--work-dir` (default
`.work`, under the **contracts checkout root**) holds the staged `build/` tree
and the tarball.

Considered shipping sources directly (rejected: larger archive, redundant with
`build-info`) and reading paths from `foundry.toml` (rejected: reintroduces a
foundry dependency and config parsing; conventional defaults plus flags
suffice).

Consequences: the build archive is a stable interface between contract builds
and deploy/verify/bindings tooling, so the contracts repo no longer owns
deploy-artifact production. The common options `--source-root` and
`--work-dir` live in `@univocity-tools/cli-kit` (`parseCommonOptions`);
Cart and deployer map `sourceRoot` to `univocityRoot` and pass
`gitRepoName: "univocity"` for discovery.

## Archive extract

`contract-artefacts archive-extract` is the inverse operation: it unpacks a **build
archive** into a **release root** and materializes Solidity sources from
`out/build-info` embedded content. The positional `archive` argument is
resolved under `--work-dir`; `--release-root` defaults to `RELEASE_ROOT`
from the environment, falling back to the current working directory when
unset or empty.

Extraction uses `tar --strip-components=1` because the tarball's single
top-level `build/` directory would otherwise nest artefacts at
`release-root/build/out/` instead of the conventional `release-root/out/`
layout expected by downstream bundle tooling.

Source hydration is owned by `@univocity-tools/foundry-artefacts`
(`hydrateSources`): iterate `out/build-info/*.json`, write
`input.sources[*].content` to relative paths under the release root,
skip existing files, warn on malformed JSON. Only build-info is read in
v1 — not `solidity-files-cache.json` (embedded content lives in
build-info).

See [ADR-0002](./adr-0002-contracts-checkout-root-discovery.md) for parse-time
root resolution and [ADR-0004](./adr-0004-deploy-propose-execute-model.md) for
the propose/execute deploy model.

Contracts release CI round-trips each **build archive** with
`archive-extract` then `archive-validate` before publish.
