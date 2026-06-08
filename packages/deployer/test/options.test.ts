import { describe, expect, test } from "bun:test";
import { DEFAULT_CREATE3_SALT } from "../create3-deploy-helpers.js";
import { parseDeployCreate3Options } from "../options.js";

const ROOT = "/tmp/univocity";

describe("parseDeployCreate3Options", () => {
  test("defaults create3Salt to univocity-create3/1", () => {
    const prevRpc = process.env.RPC_URL;
    const prevKey = process.env.PRIVATE_KEY;
    process.env.RPC_URL = "http://127.0.0.1:8545";
    process.env.PRIVATE_KEY =
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    try {
      const options = parseDeployCreate3Options({
        "univocity-root": ROOT,
      });
      expect(options.create3Salt).toBe(DEFAULT_CREATE3_SALT);
      expect(options.rpcUrl).toBe("http://127.0.0.1:8545");
      expect(options.privateKey).toMatch(/^0x/);
    } finally {
      if (prevRpc === undefined) {
        delete process.env.RPC_URL;
      } else {
        process.env.RPC_URL = prevRpc;
      }
      if (prevKey === undefined) {
        delete process.env.PRIVATE_KEY;
      } else {
        process.env.PRIVATE_KEY = prevKey;
      }
    }
  });

  test("resolves --rpc-url ${env} from RPC_URL", () => {
    const prevRpc = process.env.RPC_URL;
    process.env.RPC_URL = "http://env-host:8545";
    try {
      const options = parseDeployCreate3Options({
        "univocity-root": ROOT,
        "rpc-url": "${env}",
        "private-key": "0x01",
      });
      expect(options.rpcUrl).toBe("http://env-host:8545");
    } finally {
      if (prevRpc === undefined) {
        delete process.env.RPC_URL;
      } else {
        process.env.RPC_URL = prevRpc;
      }
    }
  });

  test("reads explicit flags", () => {
    const options = parseDeployCreate3Options({
      "univocity-root": ROOT,
      "rpc-url": "http://example:8545",
      "private-key": "abc123",
      "create3-salt": "test/salt/0",
    });
    expect(options.rpcUrl).toBe("http://example:8545");
    expect(options.privateKey).toBe("0xabc123");
    expect(options.create3Salt).toBe("test/salt/0");
  });

  test("throws when rpc url missing", () => {
    const prevRpc = process.env.RPC_URL;
    delete process.env.RPC_URL;
    try {
      expect(() =>
        parseDeployCreate3Options({
          "univocity-root": ROOT,
          "private-key": "0x01",
        }),
      ).toThrow("RPC URL is required");
    } finally {
      if (prevRpc !== undefined) {
        process.env.RPC_URL = prevRpc;
      }
    }
  });
});
