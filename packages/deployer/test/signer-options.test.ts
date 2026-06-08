import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  resolveExecuteSigner,
  resolveProposeFrom,
} from "../signer-options.js";

const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ADDR_A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const KEY_B =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const ADDR_B = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";
const DEPLOY_ADDR = "0x2222222222222222222222222222222222222222";

const ENV_KEYS = [
  "OWNER_ADDRESS",
  "DEPLOY_KEY",
  "DEPLOY_ADDRESS",
  "OWNER_SIGNER",
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

describe("resolveProposeFrom", () => {
  test("owner-address wins over deploy-key and deploy-address", () => {
    const result = resolveProposeFrom({
      "owner-address": OWNER,
      "deploy-key": KEY_A,
      "deploy-address": DEPLOY_ADDR,
    });
    expect(result.from).toBe(OWNER);
    expect(result.role).toBe("owner-address");
  });

  test("deploy-key derives from and pre-empts deploy-address", () => {
    const result = resolveProposeFrom({
      "deploy-key": KEY_A,
      "deploy-address": DEPLOY_ADDR,
    });
    expect(result.from).toBe(ADDR_A);
    expect(result.role).toBe("deploy-key");
  });

  test("falls back to deploy-address", () => {
    const result = resolveProposeFrom({ "deploy-address": DEPLOY_ADDR });
    expect(result.from).toBe(DEPLOY_ADDR);
    expect(result.role).toBe("deploy-address");
  });

  test("throws when nothing resolves", () => {
    expect(() => resolveProposeFrom({})).toThrow("propose requires a `from`");
  });
});

describe("resolveExecuteSigner", () => {
  test("prefers owner-signer over deploy-key", () => {
    const result = resolveExecuteSigner({
      "owner-signer": KEY_B,
      "deploy-key": KEY_A,
    });
    expect(result.address).toBe(ADDR_B);
    expect(result.key).toBe(KEY_B);
  });

  test("falls back to deploy-key", () => {
    const result = resolveExecuteSigner({ "deploy-key": KEY_A });
    expect(result.address).toBe(ADDR_A);
    expect(result.key).toBe(KEY_A);
  });

  test("throws when no key resolves", () => {
    expect(() => resolveExecuteSigner({})).toThrow(
      "execute requires a signing key",
    );
  });
});
