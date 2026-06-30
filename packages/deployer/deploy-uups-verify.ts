import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  assertManifestReleaseId,
  bytecodeSha256,
  predictCreate3Address,
} from "@univocity-tools/deploy-core";
import { getAddress, type Address, type Hex, type PublicClient } from "viem";
import { createRpcClients } from "./rpc-client.js";
import type { DeployUupsVerifyOptions } from "./options.js";
import {
  pickManifestLoadOptions,
  readUupsFromDeployManifest,
} from "./read-deploy-manifest.js";
import type { UupsDeploymentManifest } from "./uups-deployment-manifest.js";

const ERC1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

const UPGRADE_ADMIN_ABI = [
  {
    type: "function",
    name: "upgradeAdmin",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

async function readErc1967Implementation(
  publicClient: PublicClient,
  proxy: Address,
): Promise<Address> {
  const slot = await publicClient.getStorageAt({
    address: proxy,
    slot: ERC1967_IMPLEMENTATION_SLOT,
  });
  if (!slot || slot === "0x" + "0".repeat(64)) {
    throw new Error(`ERC-1967 proxy at ${proxy} has no implementation slot`);
  }
  return getAddress(`0x${slot.slice(-40)}`);
}

async function readOnChainUpgradeAdmin(
  publicClient: PublicClient,
  proxy: Address,
): Promise<Address> {
  return publicClient.readContract({
    address: proxy,
    abi: UPGRADE_ADMIN_ABI,
    functionName: "upgradeAdmin",
  });
}

export type UupsVerifyResult = {
  proxy: Address;
  predictedProxy: Address;
  upgradeAdmin: Address;
  implementation: Address;
};

export type UupsVerifyRunDeps = {
  publicClient?: PublicClient;
};

async function assertReleasedImplementationBytecode(
  publicClient: PublicClient,
  implementation: Address,
  deploymentManifest: UupsDeploymentManifest,
  releaseCreationDigest: string,
): Promise<void> {
  const onChain = await publicClient.getBytecode({ address: implementation });
  if (!onChain || onChain === "0x") {
    throw new Error(`no bytecode at implementation ${implementation}`);
  }
  const onChainDigest = await bytecodeSha256(onChain);
  const expectedRuntimeDigest =
    deploymentManifest.implementationBytecodeSha256?.toLowerCase();
  if (expectedRuntimeDigest === undefined) {
    throw new Error(
      "deployment manifest missing implementationBytecodeSha256; re-run deploy uups",
    );
  }
  if (onChainDigest !== expectedRuntimeDigest) {
    throw new Error(
      `implementation bytecodeSha256 mismatch: on-chain ${onChainDigest}, ` +
        `deployment manifest ${expectedRuntimeDigest}`,
    );
  }
  const pinnedReleaseDigest =
    deploymentManifest.releaseUupsBytecodeSha256?.toLowerCase();
  if (pinnedReleaseDigest === undefined) {
    throw new Error(
      "deployment manifest missing releaseUupsBytecodeSha256; re-run deploy uups with --from-manifest",
    );
  }
  if (pinnedReleaseDigest !== releaseCreationDigest.toLowerCase()) {
    throw new Error(
      `release UUPS bytecodeSha256 mismatch: deployment manifest ${pinnedReleaseDigest}, ` +
        `release deploy-manifest ${releaseCreationDigest}`,
    );
  }
}

async function verifyReleaseManifestBinding(
  publicClient: PublicClient,
  options: DeployUupsVerifyOptions,
  manifest: UupsDeploymentManifest,
  implementation: Address,
): Promise<void> {
  if (options.fromManifest === undefined) {
    return;
  }
  const manifestLoadOptions = pickManifestLoadOptions({
    manifestSidecar: options.manifestSidecar,
    expectedReleaseId: manifest.releaseTag,
    insecure: options.insecure,
  });
  const release = await readUupsFromDeployManifest(
    options.fromManifest,
    manifestLoadOptions,
  );
  if (manifest.releaseTag !== undefined) {
    assertManifestReleaseId(release.manifest, manifest.releaseTag);
  }
  const uupsEntry = release.manifest.contracts.UUPSUnivocity;
  if (uupsEntry === undefined) {
    throw new Error(
      "release deploy-manifest has no UUPSUnivocity contract entry",
    );
  }
  await assertReleasedImplementationBytecode(
    publicClient,
    implementation,
    manifest,
    uupsEntry.bytecodeSha256,
  );
}

/** Trust-check a deployed counterfactual UUPS root (ADR-0042). */
export async function runDeployUupsVerify(
  out: Out,
  options: DeployUupsVerifyOptions,
  deps?: UupsVerifyRunDeps,
): Promise<UupsVerifyResult> {
  const manifest = options.deploymentManifest;
  const clients = createRpcClients(options.rpcUrl, options.deployKey);
  const publicClient = deps?.publicClient ?? clients.publicClient;

  const predicted = predictCreate3Address(
    manifest.deployer,
    manifest.saltString,
    options.create3.factory,
  );
  if (predicted.toLowerCase() !== manifest.proxy.toLowerCase()) {
    throw new Error(
      `address re-derivation mismatch: predicted ${predicted}, manifest ${manifest.proxy}`,
    );
  }

  const code = await publicClient.getBytecode({ address: manifest.proxy });
  if (!code || code === "0x") {
    throw new Error(`no contract code at ${manifest.proxy}`);
  }

  const onChainAdmin = await readOnChainUpgradeAdmin(
    publicClient,
    manifest.proxy,
  );
  if (onChainAdmin.toLowerCase() !== manifest.upgradeAdmin.toLowerCase()) {
    throw new Error(
      `upgradeAdmin mismatch: on-chain ${onChainAdmin}, expected ${manifest.upgradeAdmin}`,
    );
  }
  if (onChainAdmin.toLowerCase() === manifest.deployer.toLowerCase()) {
    throw new Error("upgradeAdmin must not equal deployer");
  }

  const implementation = await readErc1967Implementation(
    publicClient,
    manifest.proxy,
  );
  if (implementation.toLowerCase() !== manifest.implementation.toLowerCase()) {
    throw new Error(
      `implementation mismatch: on-chain ${implementation}, manifest ${manifest.implementation}`,
    );
  }

  await verifyReleaseManifestBinding(
    publicClient,
    options,
    manifest,
    implementation,
  );

  out.out(
    "verify ok: proxy=%s upgradeAdmin=%s implementation=%s",
    manifest.proxy,
    onChainAdmin,
    implementation,
  );

  return {
    proxy: manifest.proxy,
    predictedProxy: predicted,
    upgradeAdmin: onChainAdmin,
    implementation,
  };
}
