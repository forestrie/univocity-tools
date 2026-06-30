import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import { predictCreate3Address } from "@univocity-tools/deploy-core";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { runDeployCreate3 } from "../../deploy-create3.js";
import { runDeployUups } from "../../deploy-uups.js";
import { runDeployUupsVerify } from "../../deploy-uups-verify.js";
import {
  parseDeployCreate3Options,
  parseDeployUupsOptions,
  parseDeployUupsVerifyOptions,
} from "../../options.js";
import {
  buildUupsCounterfactualGenesisBody,
  decodeGenesisCborMap,
  UUPS_GENESIS_LABELS,
} from "../helpers/uups-genesis-cbor.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const KEY_B =
  "0x59c6995e998f97a5a0044966f094538e9dcaa4cf2848bfdc17e7828a0847c9d2";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const LOG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const ANVIL_PORT = 18_547;
const ANVIL_RPC = `http://127.0.0.1:${ANVIL_PORT}`;
const MANIFEST_PATH = path.join(
  import.meta.dir,
  "..",
  "fixtures",
  "uups-from-release.manifest.json",
);

const haveAnvil = Bun.which("anvil") !== null;

describe.skipIf(!haveAnvil)("uups from manifest on anvil", () => {
  test("deploys CREATE3 factory then UUPS proxy without forge", async () => {
    const out = createNullOut();
    const workDir = mkdtempSync(path.join(tmpdir(), "uups-anvil-"));
    const account = privateKeyToAccount(KEY_A);
    const create3Options = parseDeployCreate3Options({
      "source-root": ROOT,
      "work-dir": workDir,
      "deploy-key": KEY_A,
      "rpc-url": ANVIL_RPC,
      "from-manifest": MANIFEST_PATH,
      "force-factory-deploy": true,
    });
    const uupsOptions = parseDeployUupsOptions({
      "source-root": ROOT,
      "work-dir": workDir,
      "deploy-key": KEY_A,
      "rpc-url": ANVIL_RPC,
      "from-manifest": MANIFEST_PATH,
      "log-id": LOG_ID,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    const predicted = predictCreate3Address(
      account.address,
      uupsOptions.proxySalt,
      create3Options.create3.factory,
    );

    const proc = Bun.spawn(["anvil", "--port", String(ANVIL_PORT)], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await Bun.sleep(1500);

    const publicClient = createPublicClient({
      chain: anvil,
      transport: http(ANVIL_RPC),
    });
    const walletClient = createWalletClient({
      account,
      chain: anvil,
      transport: http(ANVIL_RPC),
    });

    const arachnidSigner = create3Options.create3.signer;
    await walletClient.sendTransaction({
      account,
      chain: anvil,
      to: arachnidSigner,
      value: parseEther("1"),
    });

    const savedPath = process.env.PATH;
    Object.assign(process.env, {
      PATH: mkdtempSync(path.join(tmpdir(), "no-forge-")),
    });

    try {
      await runDeployCreate3(out, create3Options, {
        clients: { publicClient, walletClient, account },
        publicClient,
      });
      const manifest = await runDeployUups(out, uupsOptions, {
        clients: { publicClient, walletClient, account },
      });
      expect(manifest.proxy.toLowerCase()).toBe(predicted.toLowerCase());
      expect(manifest.logId).toBe(LOG_ID);
      expect(manifest.deployer.toLowerCase()).toBe(
        account.address.toLowerCase(),
      );
      const code = await publicClient.getBytecode({ address: predicted });
      expect(code !== undefined && code.length > 2).toBe(true);

      const manifestPath = path.join(workDir, "uups-deployed.json");
      await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      await runDeployUupsVerify(
        out,
        parseDeployUupsVerifyOptions({
          "source-root": ROOT,
          "deploy-key": KEY_A,
          "rpc-url": ANVIL_RPC,
          "deployment-manifest": manifestPath,
          "from-manifest": MANIFEST_PATH,
        }),
      );

      // Hermetic S8: genesis CBOR binds deployer + logId for canopy C2 (no POST).
      const genesisBody = buildUupsCounterfactualGenesisBody({
        logId: LOG_ID,
        chainId: String(manifest.chainId),
        proxyAddress: manifest.proxy,
        deployerAddress: manifest.deployer,
        bootstrapKeyAddress: OWNER,
      });
      const genesisMap = decodeGenesisCborMap(genesisBody);
      expect(genesisMap.get(UUPS_GENESIS_LABELS.LABEL_UNIVOCITY_VARIANT)).toBe(
        UUPS_GENESIS_LABELS.VARIANT_UUPS,
      );
      expect(
        Buffer.from(
          genesisMap.get(
            UUPS_GENESIS_LABELS.LABEL_UNIVOCITY_DEPLOYER,
          ) as Uint8Array,
        ).toString("hex"),
      ).toBe(manifest.deployer.slice(2).toLowerCase());
      const logIdBytes = genesisMap.get(
        UUPS_GENESIS_LABELS.LABEL_BOOTSTRAP_LOG_ID,
      ) as Uint8Array;
      expect(Buffer.from(logIdBytes.slice(16)).toString("hex")).toBe(
        LOG_ID.replace(/-/g, "").toLowerCase(),
      );

      const tamperedPath = path.join(workDir, "uups-tampered.json");
      const tampered = {
        ...manifest,
        implementationBytecodeSha256: `${"b".repeat(64)}`,
      };
      await Bun.write(tamperedPath, `${JSON.stringify(tampered, null, 2)}\n`);
      await expect(
        runDeployUupsVerify(
          out,
          parseDeployUupsVerifyOptions({
            "source-root": ROOT,
            "deploy-key": KEY_A,
            "rpc-url": ANVIL_RPC,
            "deployment-manifest": tamperedPath,
            "from-manifest": MANIFEST_PATH,
          }),
        ),
      ).rejects.toThrow(/implementation bytecodeSha256 mismatch/);

      const deployerOnly = privateKeyToAccount(KEY_B);
      const deployerOnlyClient = createWalletClient({
        account: deployerOnly,
        chain: anvil,
        transport: http(ANVIL_RPC),
      });
      await expect(
        deployerOnlyClient.writeContract({
          account: deployerOnly,
          chain: anvil,
          address: manifest.proxy,
          abi: [
            {
              type: "function",
              name: "upgradeToAndCall",
              inputs: [
                { name: "newImplementation", type: "address" },
                { name: "data", type: "bytes" },
              ],
              outputs: [],
              stateMutability: "payable",
            },
          ],
          functionName: "upgradeToAndCall",
          args: [manifest.implementation, "0x"],
        }),
      ).rejects.toThrow();
    } finally {
      process.env.PATH = savedPath;
      proc.kill();
      rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);
});
