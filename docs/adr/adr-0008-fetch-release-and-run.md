# Fetch release and workflow run artefacts

**Status:** ACCEPTED  
**Date:** 2026-06-13  
**Related:** [ADR-0006](./adr-0006-build-archive-decouples-deploy.md),
[ADR-0007](./adr-0007-release-id-format.md)

`contract-artefacts fetch-release` and `fetch-run` download contract build
archives from GitHub without curl URLs or hand-rolled `gh` download scripts.
Shared GitHub targeting flags live in `@univocity-tools/git-options`; REST
access lives in `@univocity-tools/github-api`.

## Commands

| Command | Source | Default target |
| ------- | ------ | -------------- |
| `fetch-release` | GitHub Release assets | Latest release |
| `fetch-run` | Workflow run artefacts | Latest successful run of `--workflow` |

Both commands save each tarball to `workDir/<base>/<full-name>`, where
`<base>` is derived by stripping `.tar.gz` and an optional trailing
`-vX.Y.Z(+buildid)` suffix. Example:
`workDir/univocity/univocity-v0.1.2.tar.gz`.

`--artefact` is optional. When empty, all non-ignored artefacts are fetched.
When set, it may be a base name (`univocity`) or a full file name
(`univocity-v0.1.2.tar.gz`). A non-empty selector that matches nothing is an
error. GitHub "Source code" archives and non-`.tar.gz` names are ignored.

## Shared git options

`@univocity-tools/git-options` exports mixable citty flags:

| Flag | Default |
| ---- | ------- |
| `--org` | `forestrie` |
| `--repo` | `univocity` |
| `--workflow` | `release.yml` |
| `--auth-kind` | `gh-cli` |

`fetch-release` adds `--release <tag>`. `fetch-run` adds `--run-id` and
optional `--branch` (latest-run filter).

## GitHub API and auth

`@univocity-tools/github-api` uses `fetch` against `api.github.com`. Token
resolution is controlled by `--auth-kind`:

- **`gh-cli` (default):** `gh auth token` via `@univocity-tools/subprocess`.
- **`env`:** `GITHUB_TOKEN` or `GH_TOKEN`.

Release assets download through the REST asset URL with
`Accept: application/octet-stream` (302 to storage without forwarding
`Authorization`). Workflow artefacts download the artefact zip, then `unzip`
extracts nested `.tar.gz` files.

## Workflow coupling (univocity)

`univocity/.github/workflows/release.yml` uploads one workflow artefact per
archive base (`univocity`, `create3-factory`) on every run. Tag pushes still
publish GitHub Release assets; branch and `workflow_dispatch` runs name files
with `contract-artefacts release-id` and upload artefacts only.

This makes `fetch-run` the supported path for pre-tag branch builds.
