import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import type { PublicClient } from "viem";
import { runDeployCreate3 } from "../deploy-create3.js";
import { parseDeployCreate3Options } from "../options.js";
import { createFakeRpcClients } from "./helpers/fake-rpc-clients.js";

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

  test("deploys CREATE3 factory from manifest bytecode", async () => {
    const out = createCaptureOut();
    const base = mkdtempSync(path.join(tmpdir(), "create3-manifest-"));
    const manifestPath = path.join(base, "deploy-manifest-v0.4.0.json");
    const bytecode = "0x6001" as const;
    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        releaseId: "v0.4.0",
        contracts: {
          ImutableUnivocity: {
            contractName: "ImutableUnivocity",
            creationBytecode: bytecode,
            bytecodeSha256:
              "9e67b12fd8c58953460459cad7a6d4dd7d6d57594affce8206d1397c9c4db543",
            solcVersion: "0.8.26",
          },
          CREATE3Factory: {
            contractName: "CREATE3Factory",
            creationBytecode: bytecode,
            bytecodeSha256:
              "9e67b12fd8c58953460459cad7a6d4dd7d6d57594affce8206d1397c9c4db543",
            solcVersion: "0.8.26",
          },
        },
      }),
    );
    const options = parseDeployCreate3Options({
      "source-root": ROOT,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "from-manifest": manifestPath,
      "force-factory-deploy": true,
    });
    const proxy = options.create3.proxy.toLowerCase();
    const factory = options.create3.factory.toLowerCase();
    let sendCount = 0;
    const clients = createFakeRpcClients({
      bytecode: { [proxy]: "0x6001", [factory]: "0x" },
    });
    clients.walletClient.sendTransaction = async () => {
      sendCount += 1;
      return "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    };
    const publicClient = clients.publicClient as PublicClient & {
      getBytecode: (args: { address: string }) => Promise<"0x" | "0x6001">;
    };
    const originalGetBytecode = publicClient.getBytecode.bind(publicClient);
    publicClient.getBytecode = async ({ address }) => {
      const code = await originalGetBytecode({ address });
      if (address.toLowerCase() === factory && sendCount > 0) {
        return "0x6001";
      }
      return code;
    };

    try {
      await runDeployCreate3(out, options, {
        clients,
        publicClient,
      });
      expect(sendCount).toBe(1);
      expect(
        out.lines.some((line) =>
          line.text.includes("CREATE3 factory deployed"),
        ),
      ).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
