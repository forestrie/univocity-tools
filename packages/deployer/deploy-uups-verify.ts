import type { Out } from "@univocity-tools/cli-kit/reporting";
import { predictCreate3Address } from "@univocity-tools/deploy-core";
import {
  getAddress,
  type Address,
  type PublicClient,
} from "viem";
import { createRpcClients } from "./rpc-client.js";
import type { DeployUupsVerifyOptions } from "./options.js";
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

/** Trust-check a deployed counterfactual UUPS root (ADR-0042). */
export async function runDeployUupsVerify(
  out: Out,
  options: DeployUupsVerifyOptions,
): Promise<UupsVerifyResult> {
  const manifest = options.deploymentManifest;
  const clients = createRpcClients(options.rpcUrl, options.deployKey);
  const { publicClient } = clients;

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
  if (
    implementation.toLowerCase() !== manifest.implementation.toLowerCase()
  ) {
    throw new Error(
      `implementation mismatch: on-chain ${implementation}, manifest ${manifest.implementation}`,
    );
  }

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
