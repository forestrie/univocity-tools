import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  buildErc1967ProxyCreationCode,
  bytecodeSha256,
  encodeFactoryDeployCalldata,
  encodeUupsInitializeData,
  hashProxySaltString,
  predictCreate3Address,
} from "@univocity-tools/deploy-core";
import { getAddress, type Address, type Hex, type PublicClient } from "viem";

/** EIP-1967 implementation storage slot. */
const ERC1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

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
import { resolveBootstrapKey } from "./bootstrap-key.js";
import { hasContractCode } from "./create3-deploy-helpers.js";
import type { DeployUupsOptions } from "./options.js";
import type { UupsDeploymentManifest } from "./uups-deployment-manifest.js";
import { warnUpgradeAdminGuardrails } from "./uups-deploy-options.js";
import {
  readUupsFromDeployManifest,
  pickManifestLoadOptions,
  type LoadDeployManifestOptions,
} from "./read-deploy-manifest.js";
import { createRpcClients, hasBytecodeAt } from "./rpc-client.js";
import { readUupsArtifactsFromReleaseRoot } from "./uups-artifact-paths.js";

export type { UupsDeploymentManifest } from "./uups-deployment-manifest.js";

export type DeployUupsRunDeps = {
  clients?: ReturnType<typeof createRpcClients>;
};

type UupsDeploymentDigestFields = {
  implementationBytecodeSha256?: string;
  releaseUupsBytecodeSha256?: string;
};

function buildUupsDeploymentManifest(
  options: DeployUupsOptions,
  deployer: Address,
  chainId: number,
  proxy: Address,
  implementation: Address,
  digests?: UupsDeploymentDigestFields,
): UupsDeploymentManifest {
  return {
    kind: "uups-deployment",
    version: 1,
    chainId,
    deployer,
    saltString: options.proxySalt,
    proxy,
    implementation,
    upgradeAdmin: options.upgradeAdmin,
    bootstrapAlg: options.bootstrapAlg,
    ...(options.logId !== undefined ? { logId: options.logId } : {}),
    ...(options.expectedReleaseId !== undefined
      ? { releaseTag: options.expectedReleaseId }
      : {}),
    ...(digests?.implementationBytecodeSha256 !== undefined
      ? { implementationBytecodeSha256: digests.implementationBytecodeSha256 }
      : {}),
    ...(digests?.releaseUupsBytecodeSha256 !== undefined
      ? { releaseUupsBytecodeSha256: digests.releaseUupsBytecodeSha256 }
      : {}),
  };
}

async function readImplementationBytecodeSha256(
  publicClient: ReturnType<typeof createRpcClients>["publicClient"],
  implementation: Address,
): Promise<string> {
  const code = await publicClient.getBytecode({ address: implementation });
  if (!code || code === "0x") {
    throw new Error(`no bytecode at implementation ${implementation}`);
  }
  return bytecodeSha256(code);
}

async function loadUupsArtifacts(options: DeployUupsOptions): Promise<{
  uupsImplBytecode: Hex;
  uupsCreationBytecodeSha256?: string;
  erc1967ProxyBytecode: Hex;
  initializeAbi: readonly unknown[];
}> {
  const manifestLoadOptions: LoadDeployManifestOptions | undefined =
    pickManifestLoadOptions({
      manifestSidecar: options.manifestSidecar,
      expectedReleaseId: options.expectedReleaseId,
      insecure: options.insecure,
    });
  if (options.fromManifest !== undefined) {
    const loaded = await readUupsFromDeployManifest(
      options.fromManifest,
      manifestLoadOptions,
    );
    return {
      uupsImplBytecode: loaded.uupsImplBytecode,
      uupsCreationBytecodeSha256: loaded.uupsCreationBytecodeSha256,
      erc1967ProxyBytecode: loaded.erc1967ProxyBytecode,
      initializeAbi: loaded.initializeAbi,
    };
  }
  if (options.releaseRoot !== undefined) {
    return readUupsArtifactsFromReleaseRoot(options.releaseRoot);
  }
  throw new Error(
    "deploy uups requires --from-manifest, --release-root, or --from-release",
  );
}

/** Deploy UUPSUnivocity proxy via CREATE3 factory (foundry-free). */
export async function runDeployUups(
  out: Out,
  options: DeployUupsOptions,
  deps?: DeployUupsRunDeps,
): Promise<UupsDeploymentManifest> {
  const clients =
    deps?.clients ?? createRpcClients(options.rpcUrl, options.deployKey);
  const { publicClient, walletClient, account } = clients;
  const factory = options.create3.factory;
  warnUpgradeAdminGuardrails(out, account.address, options.upgradeAdmin);
  if (options.mintedLogId && options.logId !== undefined) {
    out.print("Minted forest logId: %s", options.logId);
  }
  const factoryCode = await publicClient.getBytecode({
    address: factory,
  });
  if (!hasContractCode(factoryCode ?? "0x")) {
    throw new Error(
      `CREATE3 factory has no code at ${factory}; run deploy create3 first`,
    );
  }

  const artifacts = await loadUupsArtifacts(options);
  const predictedProxy = predictCreate3Address(
    account.address,
    options.proxySalt,
    factory,
  );
  out.print("Predicted UUPS proxy address: %s", predictedProxy);

  if (await hasBytecodeAt(publicClient, predictedProxy)) {
    const implementation = await readErc1967Implementation(
      publicClient,
      predictedProxy,
    );
    out.out(
      "UUPSUnivocity proxy already deployed at %s (implementation %s)",
      predictedProxy,
      implementation,
    );
    const chainId = await publicClient.getChainId();
    const implementationBytecodeSha256 =
      await readImplementationBytecodeSha256(publicClient, implementation);
    return buildUupsDeploymentManifest(
      options,
      account.address,
      chainId,
      predictedProxy,
      implementation,
      {
        implementationBytecodeSha256,
        ...(artifacts.uupsCreationBytecodeSha256 !== undefined
          ? { releaseUupsBytecodeSha256: artifacts.uupsCreationBytecodeSha256 }
          : {}),
      },
    );
  }

  const bootstrap =
    options.bootstrapAlg === "es256"
      ? await resolveBootstrapKey({
          alg: "es256",
          ...(options.es256Pem !== undefined ? { pem: options.es256Pem } : {}),
          ...(options.es256Pub64 !== undefined
            ? { pub64: options.es256Pub64 }
            : {}),
          ...(options.es256X !== undefined ? { x: options.es256X } : {}),
          ...(options.es256Y !== undefined ? { y: options.es256Y } : {}),
        })
      : await resolveBootstrapKey({
          alg: "ks256",
          signer: options.ks256Signer!,
        });

  out.print("Deploying UUPSUnivocity implementation...");
  const implHash = await walletClient.sendTransaction({
    account,
    chain: null,
    data: artifacts.uupsImplBytecode,
    value: 0n,
  });
  const implReceipt = await publicClient.waitForTransactionReceipt({
    hash: implHash,
  });
  if (!implReceipt.contractAddress) {
    throw new Error("UUPSUnivocity implementation deployment failed");
  }
  const implementation = getAddress(implReceipt.contractAddress);
  out.print("UUPSUnivocity implementation at %s", implementation);

  const initData = encodeUupsInitializeData(bootstrap, options.upgradeAdmin);
  const proxyCreationCode = buildErc1967ProxyCreationCode(
    artifacts.erc1967ProxyBytecode,
    implementation,
    initData,
  );
  const salt = hashProxySaltString(options.proxySalt);
  const calldata = encodeFactoryDeployCalldata(salt, proxyCreationCode);

  out.print("Deploying UUPS proxy via CREATE3 factory %s...", factory);
  const deployHash = await walletClient.sendTransaction({
    account,
    chain: null,
    to: factory,
    data: calldata,
    value: 0n,
  });
  const deployReceipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash,
  });
  if (deployReceipt.status !== "success") {
    throw new Error(`UUPS proxy CREATE3 deployment failed: ${deployHash}`);
  }

  if (!(await hasBytecodeAt(publicClient, predictedProxy))) {
    throw new Error(
      `UUPS proxy still has no code at ${predictedProxy} after deployment`,
    );
  }

  const chainId = await publicClient.getChainId();
  const implementationBytecodeSha256 = await readImplementationBytecodeSha256(
    publicClient,
    implementation,
  );
  const manifest = buildUupsDeploymentManifest(
    options,
    account.address,
    chainId,
    predictedProxy,
    implementation,
    {
      implementationBytecodeSha256,
      ...(artifacts.uupsCreationBytecodeSha256 !== undefined
        ? { releaseUupsBytecodeSha256: artifacts.uupsCreationBytecodeSha256 }
        : {}),
    },
  );
  out.out("UUPSUnivocity proxy deployed at %s", predictedProxy);
  return manifest;
}
