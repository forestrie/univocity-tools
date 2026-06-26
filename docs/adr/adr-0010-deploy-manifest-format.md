# Deploy manifest release asset format

Univocity GitHub releases already ship **build archives** (`univocity-<id>.tar.gz`)
containing the full forge `out/` tree. Consumers can extract those archives and
pass `--release-root` to `deploy propose imutable`, but extraction is heavy for
CLI one-shots and awkward in browsers.

We add a lightweight **deploy-manifest** JSON asset
(`deploy-manifest-<release-id>.json`) published alongside each release. It
carries the creation bytecode and metadata deploy tooling needs without
unpacking tarballs.

## Schema (version 1)

```json
{
  "version": 1,
  "releaseId": "v0.4.0",
  "contracts": {
    "ImutableUnivocity": {
      "contractName": "ImutableUnivocity",
      "creationBytecode": "0x…",
      "bytecodeSha256": "<64-char lowercase hex>",
      "solcVersion": "0.8.26",
      "constructorAbi": []
    },
    "CREATE3Factory": {
      "contractName": "CREATE3Factory",
      "creationBytecode": "0x…",
      "bytecodeSha256": "<64-char lowercase hex>",
      "solcVersion": "0.8.26"
    }
  }
}
```

- **`bytecodeSha256`**: SHA-256 of the raw creation bytecode bytes (the value
  behind `creationBytecode`, not the JSON string). Lowercase hex, no `0x`.
- **`CREATE3Factory`**: optional; present when the release includes the shared
  factory archive.
- **`constructorAbi`**: optional JSON ABI fragment for the constructor; omitted
  when empty.

The Univocity release workflow generates the manifest from forge `out/` after
`forge build`. A sidecar `deploy-manifest-<id>.json.sha256` uses the same
`shasum -a 256` format as build archive checksums.

## Consumer behaviour

`deploy propose imutable --from-manifest <file|url>` (env: `DEPLOY_MANIFEST`):

1. Load JSON from a local path or `http(s)` URL.
2. Validate schema (`validateDeployManifest`).
3. Recompute `bytecodeSha256` for each contract entry and reject on mismatch.
4. Use `contracts.ImutableUnivocity.creationBytecode` as the propose input.

`--from-manifest` is mutually exclusive with `--release-root`. Both paths skip
`forge`/`cast` on propose.

## Relation to build archives

Build archives remain the source of truth for verify/bindings workflows that
need `build-info` and hydrated sources ([ADR-0006](./adr-0006-build-archive-decouples-deploy.md)).
The deploy manifest is a **derived, variant** for deploy-only consumers
(CLI one-shot, browser installer). Bytecode in the manifest must match the
corresponding forge artifact in the release archive.

## Consequences

- Browser and foundry-free CLI paths can fetch a single small JSON file.
- Manifest schema is versioned; bump `version` for breaking changes.
- Producer (univocity release CI) and consumer (univocity-tools deployer) must
  land together or in producer-first order.
