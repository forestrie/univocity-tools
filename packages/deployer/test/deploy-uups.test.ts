import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import { predictCreate3Address } from "@univocity-tools/deploy-core";
import type { PublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { runDeployCreate3 } from "../deploy-create3.js";
import { runDeployUups } from "../deploy-uups.js";
import {
  parseDeployCreate3Options,
  parseDeployUupsFromReleaseOptions,
  parseDeployUupsOptions,
} from "../options.js";
import { createFakeRpcClients } from "./helpers/fake-rpc-clients.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const IMPL = "0x2222222222222222222222222222222222222222" as const;

describe("runDeployUups", () => {
  test("no-ops when predicted proxy already has code", async () => {
    const out = createCaptureOut();
    const account = privateKeyToAccount(KEY_A);
    const create3Opts = parseDeployCreate3Options({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
    });
    const predicted = predictCreate3Address(
      account.address,
      "forestrie.eth/univocity/UUPSUnivocity/0",
      create3Opts.create3.factory,
    );
    const manifestPath = path.join(
      import.meta.dir,
      "fixtures",
      "uups-from-release.manifest.json",
    );
    const options = parseDeployUupsOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "from-manifest": manifestPath,
      "proxy-salt": "forestrie.eth/univocity/UUPSUnivocity/0",
      "upgrade-admin": OWNER,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    const factory = options.create3.factory.toLowerCase();
    const implSlot =
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const impl = IMPL.toLowerCase();
    const clients = createFakeRpcClients({
      bytecode: {
        [factory]: "0x6001",
        [predicted.toLowerCase()]: "0x6001",
        [impl]: "0x6001",
      },
      storage: {
        [`${predicted.toLowerCase()}:${implSlot}`]: `0x000000000000000000000000${IMPL.slice(2)}`,
      },
    });
    const result = await runDeployUups(out, options, { clients });
    expect(result.proxy.toLowerCase()).toBe(predicted.toLowerCase());
    expect(result.implementation.toLowerCase()).toBe(IMPL.toLowerCase());
  });

  test("deploys implementation and proxy via CREATE3 factory", async () => {
    const out = createCaptureOut();
    const account = privateKeyToAccount(KEY_A);
    const create3Opts = parseDeployCreate3Options({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
    });
    const predicted = predictCreate3Address(
      account.address,
      "forestrie.eth/univocity/UUPSUnivocity/0",
      create3Opts.create3.factory,
    );
    const manifestPath = path.join(
      import.meta.dir,
      "fixtures",
      "uups-from-release.manifest.json",
    );
    const options = parseDeployUupsOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "from-manifest": manifestPath,
      "proxy-salt": "forestrie.eth/univocity/UUPSUnivocity/0",
      "upgrade-admin": OWNER,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    const factory = options.create3.factory.toLowerCase();
    const proxy = predicted.toLowerCase();
    let txCount = 0;
    const impl = IMPL.toLowerCase();
    const clients = createFakeRpcClients({
      bytecode: { [factory]: "0x6001", [proxy]: "0x", [impl]: "0x6001" },
      contractAddress: IMPL,
    });
    clients.walletClient.sendTransaction = async () => {
      txCount += 1;
      return "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    };
    const publicClient = clients.publicClient as PublicClient & {
      getBytecode: (args: { address: string }) => Promise<"0x" | "0x6001">;
    };
    const originalGetBytecode = publicClient.getBytecode.bind(publicClient);
    publicClient.getBytecode = async ({ address }) => {
      const code = await originalGetBytecode({ address });
      if (address.toLowerCase() === proxy && txCount >= 2) {
        return "0x6001";
      }
      return code;
    };

    const result = await runDeployUups(out, options, { clients });
    expect(txCount).toBe(2);
    expect(result.proxy.toLowerCase()).toBe(proxy);
    expect(result.implementation.toLowerCase()).toBe(IMPL.toLowerCase());
  });
});

describe("parseDeployUupsFromReleaseOptions", () => {
  test("defaults from-release to latest when omitted", () => {
    const options = parseDeployUupsFromReleaseOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "proxy-salt": "forestrie.eth/univocity/UUPSUnivocity/0",
      "upgrade-admin": OWNER,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    expect(options.fromRelease).toBe("latest");
  });
});
