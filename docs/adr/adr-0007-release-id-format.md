# Release id format and derivation

`contract-artefacts release-id` derives a **release id** that identifies a
contract build: `release-tag+build-id`, e.g. `v0.1.1+260612-21c98ad`. The
release tag is the semver version; the build id is `YYMMDD-<short-commit>`.
`archive --release-id` reuses the same derivation to name a **build archive**
`<name>-<release-id>.tar.gz`.

The release tag is the most recent semver-shaped git tag in the **contracts
checkout** by creation date (`git tag --sort=-creatordate`, optional leading
`v`), filtered to `MAJOR.MINOR.PATCH` so non-release tags are ignored, falling
back to `v0.0.0` when none exist. `--next-major` / `--next-minor` /
`--next-patch` bump the version (resetting lower levels) for pre-tag release
candidates; `--next` aliases `--next-minor` and the flags are mutually
exclusive. The leading `v` is preserved from the source tag.

The build id combines the current UTC date as compact `YYMMDD` with the
abbreviated HEAD commit (`git rev-parse --short HEAD`). The command errors when
`--source-root` is not a git repository, because `parseCommonOptions` otherwise
silently falls back to the working directory (see
[ADR-0002](./adr-0002-contracts-checkout-root-discovery.md)).

The date is the build time (when the command runs), not the HEAD commit date.
Consequence: the release id for a fixed commit changes day to day, so it is not
reproducible from the commit alone. Accepted because it matches the prototype
taskfile convention and keeps derivation to plain git plus the wall clock. If
reproducibility per commit is needed later, switch the date source to the
committer date (`git show -s --format=%cd`) without changing the format.

See [ADR-0006](./adr-0006-build-archive-decouples-deploy.md) for the build
archive that consumes the release id in its file name.
