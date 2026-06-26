import { afterEach, describe, expect, test } from "bun:test";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import type { PublicClient } from "viem";
import { runDeployCreate3 } from "../deploy-create3.js";
import { parseDeployCreate3Options } from "../options.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("runDeployCreate3", () => {
  test("returns early when factory already has code (no forge)", async () => {
    const out = createCaptureOut();
    const options = parseDeployCreate3Options({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "release-root": "/tmp/release-root-fixture",
    });
    const factory = options.create3.factory.toLowerCase();
    const publicClient = {
      getBytecode: async ({ address }: { address: string }) =>
        address.toLowerCase() === factory ? ("0x6001" as const) : "0x",
    } as unknown as PublicClient;

    await runDeployCreate3(out, options, { publicClient });
    expect(
      out.lines.some((line) => line.text.includes("already deployed")),
    ).toBe(true);
  });
});
