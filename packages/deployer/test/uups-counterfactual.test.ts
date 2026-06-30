import { describe, expect, test } from "bun:test";
import {
  predictCreate3Address,
  uupsProxySaltString,
} from "@univocity-tools/deploy-core";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  parseDeployUupsOptions,
  parseDeployUupsPredictOptions,
} from "../options.js";
import {
  mintForestLogId,
  resolveUupsSaltAndLogId,
  resolveUpgradeAdminForUups,
} from "../uups-deploy-options.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const FACTORY = "0x988e1Ef32F200E84197266eC0Fd36cC9a1d849dF" as Address;
const LOG_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

describe("resolveUupsSaltAndLogId", () => {
  test("uses counterfactual salt from --log-id", () => {
    const resolved = resolveUupsSaltAndLogId({ "log-id": LOG_ID });
    expect(resolved.logId).toBe(LOG_ID);
    expect(resolved.proxySalt).toBe(uupsProxySaltString(LOG_ID));
    expect(resolved.mintedLogId).toBe(false);
  });

  test("mints logId when neither log-id nor proxy-salt provided", () => {
    const resolved = resolveUupsSaltAndLogId(
      {},
      () => "00000000-0000-4000-8000-000000000000",
    );
    expect(resolved.logId).toBe("00000000-0000-4000-8000-000000000000");
    expect(resolved.mintedLogId).toBe(true);
  });

  test("legacy proxy-salt bypasses counterfactual logId", () => {
    const legacy = "forestrie.eth/univocity/UUPSUnivocity/0";
    const resolved = resolveUupsSaltAndLogId({ "proxy-salt": legacy });
    expect(resolved.proxySalt).toBe(legacy);
    expect(resolved.logId).toBeUndefined();
  });
});

describe("resolveUpgradeAdminForUups", () => {
  test("KS256 defaults upgradeAdmin to bootstrap signer", () => {
    const admin = resolveUpgradeAdminForUups(
      { "bootstrap-ks256-signer": OWNER },
      "ks256",
    );
    expect(admin.toLowerCase()).toBe(OWNER.toLowerCase());
  });

  test("ES256 requires explicit upgrade-admin", () => {
    expect(() =>
      resolveUpgradeAdminForUups({ "bootstrap-alg": "es256" }, "es256"),
    ).toThrow(/upgrade-admin.*required for ES256/i);
  });
});

describe("parseDeployUupsPredictOptions", () => {
  test("--log-id yields deterministic counterfactual address inputs", () => {
    const options = parseDeployUupsPredictOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "log-id": LOG_ID,
    });
    const deployer = privateKeyToAccount(KEY_A).address;
    const predicted = predictCreate3Address(
      deployer,
      options.proxySalt,
      options.create3.factory,
    );
    expect(options.logId).toBe(LOG_ID);
    expect(predicted.toLowerCase()).toBe(
      "0xbfb9ef37b28bd71a89a6d8afe27eb368cef17347",
    );
  });
});

describe("parseDeployUupsOptions determinism", () => {
  test("distinct logIds yield distinct addresses", () => {
    const deployer = privateKeyToAccount(KEY_A).address;
    const a = parseDeployUupsOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "log-id": LOG_ID,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    const b = parseDeployUupsOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "log-id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    const addrA = predictCreate3Address(deployer, a.proxySalt, FACTORY);
    const addrB = predictCreate3Address(deployer, b.proxySalt, FACTORY);
    expect(addrA.toLowerCase()).not.toBe(addrB.toLowerCase());
  });

  test("same deployer+logId is idempotent (same salt)", () => {
    const first = parseDeployUupsOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "log-id": LOG_ID,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    const second = parseDeployUupsOptions({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "log-id": LOG_ID,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
    });
    expect(first.proxySalt).toBe(second.proxySalt);
  });

  test("different deployer with same logId yields different address", () => {
    const keyB =
      "0x59c6995e998f97a5a0044966f094538e9dcaa4cf2848bfdc17e7828a0847c9d2";
    const deployerA = privateKeyToAccount(KEY_A).address;
    const deployerB = privateKeyToAccount(keyB).address;
    const salt = uupsProxySaltString(LOG_ID);
    const addrA = predictCreate3Address(deployerA, salt, FACTORY);
    const addrB = predictCreate3Address(deployerB, salt, FACTORY);
    expect(addrA.toLowerCase()).not.toBe(addrB.toLowerCase());
  });

  test("mintForestLogId returns a UUID", () => {
    expect(mintForestLogId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
