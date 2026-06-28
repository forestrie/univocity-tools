import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import { ALG_KS256 } from "../deploy-constants.js";
import { IMUTABLE_ARTIFACT_REL } from "../imutable-artifact.js";
import { runProvisionImutableAlg } from "../provision-imutable-alg.js";

const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const CREATE3_FIXTURE = {
  proxy: "0x4e59b44847b379578588920cA78FbF26c0B4956C" as const,
  "deploy-tx":
    "0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222" as const,
  signer: "0x3fAB184622Dc19b6109349B94811493BF2a45362" as const,
  factory: "0x988e1Ef32F200E84197266eC0Fd36cC9a1d849dF" as const,
  "uups-salt": "forestrie.eth/univocity/UUPSUnivocity/0" as const,
};
const FIXTURE_BYTECODE = "0x6001";
const ANVIL_PORT = 18_545;
const ANVIL_RPC = `http://127.0.0.1:${ANVIL_PORT}`;

const castBin = Bun.which("cast");
const forgeBin = Bun.which("forge");
const haveAnvil =
  Bun.which("anvil") !== null && castBin !== null && forgeBin !== null;

function writeReleaseRootFixture(releaseRoot: string): void {
  const artifactDir = path.join(
    releaseRoot,
    "out",
    path.dirname(IMUTABLE_ARTIFACT_REL),
  );
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(
    path.join(releaseRoot, "out", IMUTABLE_ARTIFACT_REL),
    JSON.stringify({ bytecode: { object: FIXTURE_BYTECODE } }),
  );
}

describe.skipIf(!haveAnvil)("runProvisionImutableAlg on anvil", () => {
  test("deploys contract code from release root fixture", async () => {
    const base = mkdtempSync(path.join(tmpdir(), "provision-anvil-"));
    const releaseRoot = path.join(base, "release");
    const workDir = path.join(base, "work");
    const proposalDir = path.join(workDir, "proposals");
    const ks256KeyOut = path.join(workDir, "ks256.key");
    mkdirSync(proposalDir, { recursive: true });
    writeReleaseRootFixture(releaseRoot);

    const proc = Bun.spawn(["anvil", "--port", String(ANVIL_PORT)], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await Bun.sleep(1500);
    try {
      const result = await runProvisionImutableAlg(createNullOut(), {
        univocityRoot: base,
        workDir,
        create3: { ...CREATE3_FIXTURE },
        forgeConfig: path.join(base, "foundry.toml"),
        buildRoot: base,
        outDir: "out",
        srcDir: "src",
        cacheDir: "cache",
        libsDir: "lib",
        castBin: castBin!,
        forgeBin: forgeBin!,
        releaseRoot,
        proposalDir,
        runId: "anvil-test",
        bootstrapAlg: "ks256",
        rpcUrl: ANVIL_RPC,
        deployKey: KEY_A,
        es256PemOut: path.join(workDir, "es256.pem"),
        ks256KeyOut,
        codePollAttempts: 10,
        codePollIntervalMs: 200,
        skipCodeWait: true,
      });

      expect(existsSync(result.manifestPath)).toBe(true);
      expect(result.manifest.bootstrapAlg).toBe("ks256");
      expect(result.manifest.chainId).toBe(31337);
      expect(result.manifest.imutableUnivocity).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(result.manifest.publishMode).toBe("eoa");
      expect(ALG_KS256).toBe(-65799n);
    } finally {
      proc.kill();
      rmSync(base, { recursive: true, force: true });
    }
  }, 30_000);
});
