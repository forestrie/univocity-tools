import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import { bytecodeSha256 } from "@univocity-tools/deploy-core";
import type { Address, Hex, PublicClient } from "viem";
import { runDeployUupsVerify } from "../deploy-uups-verify.js";
import {
  parseDeployUupsVerifyOptions,
  type DeployUupsVerifyOptions,
} from "../options.js";
import type { UupsDeploymentManifest } from "../uups-deployment-manifest.js";
import { createFakeRpcClients } from "./helpers/fake-rpc-clients.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const PROXY = "0xbFb9Ef37B28BD71a89a6D8aFe27eB368CEF17347" as Address;
const DEPLOYER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
const UPGRADE_ADMIN = "0x1528b86ff561f617602356efdbD05908a07AA788" as Address;
const IMPL = "0x1111111111111111111111111111111111111111" as Address;
const ERC1967_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;

const RELEASE_IMPL_BYTECODE = "0x6001" as Hex;
const OTHER_BYTECODE = "0x6002" as Hex;

function baseDeploymentManifest(
  overrides?: Partial<UupsDeploymentManifest>,
): UupsDeploymentManifest {
  return {
    kind: "uups-deployment",
    version: 1,
    chainId: 31337,
    deployer: DEPLOYER,
    logId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    saltString:
      "forestrie.eth/univocity/UUPSUnivocity/v1/a1b2c3d4e5f67890abcdef1234567890",
    proxy: PROXY,
    implementation: IMPL,
    upgradeAdmin: UPGRADE_ADMIN,
    bootstrapAlg: "ks256",
    releaseTag: "v0.4.0-test",
    ...overrides,
  };
}

function encodeAddressSlot(address: Address): Hex {
  return `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}` as Hex;
}

function buildVerifyOptions(
  dir: string,
  deploymentManifest: UupsDeploymentManifest,
  releaseManifestPath?: string,
): DeployUupsVerifyOptions {
  const deploymentPath = path.join(dir, "uups-deployment.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentManifest, null, 2));
  return parseDeployUupsVerifyOptions({
    "source-root": ROOT,
    "deploy-key": KEY_A,
    "rpc-url": "http://127.0.0.1:8545",
    "deployment-manifest": deploymentPath,
    ...(releaseManifestPath !== undefined
      ? { "from-manifest": releaseManifestPath }
      : {}),
  });
}

async function writeReleaseManifest(
  dir: string,
  implBytecode: Hex,
  releaseId = "v0.4.0-test",
): Promise<{ path: string; creationDigest: string }> {
  const implDigest = await bytecodeSha256(implBytecode);
  const manifestPath = path.join(dir, "deploy-manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({
      version: 1,
      releaseId,
      contracts: {
        ImutableUnivocity: {
          contractName: "ImutableUnivocity",
          creationBytecode: OTHER_BYTECODE,
          bytecodeSha256: await bytecodeSha256(OTHER_BYTECODE),
          solcVersion: "0.8.26",
        },
        UUPSUnivocity: {
          contractName: "UUPSUnivocity",
          creationBytecode: implBytecode,
          bytecodeSha256: implDigest,
          solcVersion: "0.8.26",
          abi: [
            {
              type: "function",
              name: "initialize",
              inputs: [
                { name: "upgradeAdmin_", type: "address" },
                { name: "bootstrapAlg_", type: "int64" },
                { name: "bootstrapKey_", type: "bytes" },
              ],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
        },
        ERC1967Proxy: {
          contractName: "ERC1967Proxy",
          creationBytecode: "0x6003",
          bytecodeSha256: await bytecodeSha256("0x6003"),
          solcVersion: "0.8.26",
        },
      },
    }),
  );
  return { path: manifestPath, creationDigest: implDigest };
}

describe("runDeployUupsVerify release manifest", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  test("accepts matching release manifest implementation bytecode", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "uups-verify-"));
    const { path: releasePath, creationDigest } = await writeReleaseManifest(
      tempDir,
      RELEASE_IMPL_BYTECODE,
    );
    const runtimeDigest = await bytecodeSha256(RELEASE_IMPL_BYTECODE);
    const deployment = baseDeploymentManifest({
      implementationBytecodeSha256: runtimeDigest,
      releaseUupsBytecodeSha256: creationDigest,
    });
    const clients = createFakeRpcClients({
      bytecode: {
        [PROXY.toLowerCase()]: "0x6001",
        [IMPL.toLowerCase()]: RELEASE_IMPL_BYTECODE,
      },
      storage: {
        [`${PROXY.toLowerCase()}:${ERC1967_SLOT.toLowerCase()}`]:
          encodeAddressSlot(IMPL),
      },
    });
    clients.publicClient.readContract = (async () =>
      UPGRADE_ADMIN) as PublicClient["readContract"];

    await runDeployUupsVerify(
      createNullOut(),
      buildVerifyOptions(tempDir, deployment, releasePath),
      { publicClient: clients.publicClient as PublicClient },
    );
  });

  test("rejects release manifest when implementation runtime digest mismatches", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "uups-verify-"));
    const { path: releasePath, creationDigest } = await writeReleaseManifest(
      tempDir,
      RELEASE_IMPL_BYTECODE,
    );
    const deployment = baseDeploymentManifest({
      implementationBytecodeSha256: `${"a".repeat(64)}`,
      releaseUupsBytecodeSha256: creationDigest,
    });
    const clients = createFakeRpcClients({
      bytecode: {
        [PROXY.toLowerCase()]: "0x6001",
        [IMPL.toLowerCase()]: RELEASE_IMPL_BYTECODE,
      },
      storage: {
        [`${PROXY.toLowerCase()}:${ERC1967_SLOT.toLowerCase()}`]:
          encodeAddressSlot(IMPL),
      },
    });
    clients.publicClient.readContract = (async () =>
      UPGRADE_ADMIN) as PublicClient["readContract"];

    await expect(
      runDeployUupsVerify(
        createNullOut(),
        buildVerifyOptions(tempDir, deployment, releasePath),
        { publicClient: clients.publicClient as PublicClient },
      ),
    ).rejects.toThrow(/implementation bytecodeSha256 mismatch/);
  });

  test("rejects releaseId mismatch against deployment releaseTag", async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "uups-verify-"));
    const { path: releasePath, creationDigest } = await writeReleaseManifest(
      tempDir,
      RELEASE_IMPL_BYTECODE,
      "v9.9.9-wrong",
    );
    const runtimeDigest = await bytecodeSha256(RELEASE_IMPL_BYTECODE);
    const deployment = baseDeploymentManifest({
      implementationBytecodeSha256: runtimeDigest,
      releaseUupsBytecodeSha256: creationDigest,
    });
    const clients = createFakeRpcClients({
      bytecode: {
        [PROXY.toLowerCase()]: "0x6001",
        [IMPL.toLowerCase()]: RELEASE_IMPL_BYTECODE,
      },
      storage: {
        [`${PROXY.toLowerCase()}:${ERC1967_SLOT.toLowerCase()}`]:
          encodeAddressSlot(IMPL),
      },
    });
    clients.publicClient.readContract = (async () =>
      UPGRADE_ADMIN) as PublicClient["readContract"];

    await expect(
      runDeployUupsVerify(
        createNullOut(),
        buildVerifyOptions(tempDir, deployment, releasePath),
        { publicClient: clients.publicClient as PublicClient },
      ),
    ).rejects.toThrow(/releaseId mismatch/);
  });
});
