# ADR-0012 — Foundry-free UUPS deploy from release

## Context

UUPSUnivocity deploys to a deterministic CREATE3 address via the shared
Arachnid factory ([univocity `DeployProxyUUPSUnivocity.s.sol`](https://github.com/forestrie/univocity/blob/main/script/DeployProxyUUPSUnivocity.s.sol)).
The legacy path (`task deploy:uups`) runs `forge script` and requires a full
contracts checkout.

Operators on a **fresh chain** need only the `deployer` binary and a published
Univocity release (deploy-manifest + sidecar).

## Decision

1. Extend the deploy-manifest with `UUPSUnivocity` (implementation bytecode +
   ABI) and `ERC1967Proxy` (proxy creation bytecode).
2. Port `LibCreate3Address` to TypeScript (`predictCreate3Address` in
   `@univocity-tools/deploy-core`).
3. Add `deploy uups` / `deploy uups --from-release` that:
   - EOA-deploys the implementation (`CREATE` with manifest bytecode).
   - Builds proxy creation code:
     `ERC1967Proxy.creationCode ++ abi.encode(impl, initialize(...))`.
   - Calls `CREATE3Factory.deploy(salt, proxyCreationCode)`.
   - Asserts the deployed proxy matches the predicted address.
4. EOA-only for this slice; Safe propose/execute deferred.

Trust model matches [ADR-0010](./adr-0010-deploy-manifest-format.md): GitHub
release TLS + `.sha256` sidecar on `--from-release`; embedded `bytecodeSha256`
detects corruption.

## Consequences

- Fresh-chain operators run `deploy create3 --from-release` then
  `deploy uups --from-release` without `forge`/`cast`.
- Proxy address is knowable before deploy (genesis-critical).
- Implementation bytecode changes do not change the proxy address.
- Browser UUPS deploy and on-chain upgrades remain out of scope.
