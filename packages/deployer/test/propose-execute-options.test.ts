import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_CREATE_CALL,
  DEFAULT_SAFE_TX_SERVICE_URL,
} from "../deploy-constants.js";
import {
  parseExecuteProposalOptions,
  parseProposeImutableOptions,
} from "../options.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ADDR_A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";

const ENV_KEYS = [
  "OWNER_ADDRESS",
  "DEPLOY_KEY",
  "DEPLOY_ADDRESS",
  "OWNER_SIGNER",
  "BOOTSTRAP_ALG",
  "KS256_SIGNER",
  "ES256_X",
  "ES256_Y",
  "BOOTSTRAP_PEM_ES256",
  "CREATE_CALL_ADDRESS",
  "SAFE_BATCH_SALT",
  "CHAIN_ID",
  "RPC_URL",
  "SAFE_TX_SERVICE_URL",
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = saved[k];
    }
  }
});

describe("parseProposeImutableOptions", () => {
  test("ks256 with deploy-key derives from + defaults", () => {
    const options = parseProposeImutableOptions({
      "univocity-root": ROOT,
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
    });
    expect(options.bootstrapAlg).toBe("ks256");
    expect(options.ks256Signer).toBe(OWNER);
    expect(options.from).toBe(ADDR_A);
    expect(options.signerRole).toBe("deploy-key");
    expect(options.safePublish).toBe(false);
    expect(options.createCallAddress).toBe(DEFAULT_CREATE_CALL);
    expect(options.safeTxServiceUrl).toBe(DEFAULT_SAFE_TX_SERVICE_URL);
    expect(options.deployKey).toBe(KEY_A);
  });

  test("owner-address wins for from; safe-publish flag", () => {
    const options = parseProposeImutableOptions({
      "univocity-root": ROOT,
      "bootstrap-alg": "es256",
      "bootstrap-es256-x": `0x${"aa".repeat(32)}`,
      "bootstrap-es256-y": `0x${"bb".repeat(32)}`,
      "owner-address": OWNER,
      "deploy-key": KEY_A,
      "safe-publish": true,
    });
    expect(options.from).toBe(OWNER);
    expect(options.signerRole).toBe("owner-address");
    expect(options.safePublish).toBe(true);
    expect(options.es256X).toBe(`0x${"aa".repeat(32)}`);
  });

  test("throws when bootstrap-alg missing", () => {
    expect(() =>
      parseProposeImutableOptions({
        "univocity-root": ROOT,
        "deploy-key": KEY_A,
      }),
    ).toThrow("bootstrap-alg");
  });

  test("rejects non-32-byte salt", () => {
    expect(() =>
      parseProposeImutableOptions({
        "univocity-root": ROOT,
        "bootstrap-alg": "ks256",
        "bootstrap-ks256-signer": OWNER,
        "deploy-key": KEY_A,
        salt: "0x1234",
      }),
    ).toThrow("--salt must be a 32-byte hex value");
  });
});

describe("parseExecuteProposalOptions", () => {
  test("reads positional proposal file + deploy-key signer", () => {
    const options = parseExecuteProposalOptions({
      _: ["proposal.json"],
      "univocity-root": ROOT,
      "deploy-key": KEY_A,
    });
    expect(options.proposalFile).toBe("proposal.json");
    expect(options.signer.address).toBe(ADDR_A);
  });

  test("owner-signer preferred; no positional means stdin (undefined file)", () => {
    const options = parseExecuteProposalOptions({
      "univocity-root": ROOT,
      "owner-signer": KEY_A,
    });
    expect(options.proposalFile).toBeUndefined();
    expect(options.signer.address).toBe(ADDR_A);
  });
});
