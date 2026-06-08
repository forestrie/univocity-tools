import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseApproveProposalOptions } from "../options.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const ENV_KEYS = [
  "OWNER_SIGNER",
  "DEPLOY_KEY",
  "RPC_URL",
  "SAFE_TX_HASH",
  "SAFE_TX_SERVICE_URL",
  "UNIVOCITY_ROOT",
];

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
});

describe("parseApproveProposalOptions", () => {
  test("requires rpc url", () => {
    expect(() =>
      parseApproveProposalOptions({
        _: ["proposal.json"],
        "bootstrap-alg": "es256",
        "univocity-root": ROOT,
        "deploy-key": KEY_A,
      }),
    ).toThrow("approve requires --rpc-url");
  });

  test("prefers owner-signer over deploy-key", () => {
    const options = parseApproveProposalOptions({
      _: ["proposal.json"],
      "bootstrap-alg": "es256",
      "univocity-root": ROOT,
      "owner-signer": KEY_A,
      "deploy-key":
        "0x59c6995e998f97a5a0044966f094538e9dcbb4ac836c072693865c7830d11d60",
      "rpc-url": "http://127.0.0.1:8545",
    });
    expect(options.signer.address).toBe(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    );
    expect(options.confirmOnly).toBe(false);
  });

  test("parses confirm-only and safe-tx-hash", () => {
    const options = parseApproveProposalOptions({
      _: ["proposal.json"],
      "bootstrap-alg": "es256",
      "univocity-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "confirm-only": true,
      "safe-tx-hash": `0x${"cd".repeat(32)}`,
    });
    expect(options.confirmOnly).toBe(true);
    expect(options.safeTxHash).toBe(`0x${"cd".repeat(32)}`);
  });
});
