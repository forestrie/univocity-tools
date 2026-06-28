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
import {
  parseDeployCreate3Options,
  parseDeployUupsOptions,
} from "../../options.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
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
      "upgrade-admin": OWNER,
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
      const code = await publicClient.getBytecode({ address: predicted });
      expect(code !== undefined && code.length > 2).toBe(true);
    } finally {
      process.env.PATH = savedPath;
      proc.kill();
      rmSync(workDir, { recursive: true, force: true });
    }
  }, 120_000);
});
