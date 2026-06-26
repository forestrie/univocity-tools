import { describe, expect, test } from "bun:test";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import { runDeployImutableFromRelease } from "../deploy-imutable-from-release.js";
import { parseDeployImutableFromReleaseOptions } from "../options.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const OWNER = "0x1528b86ff561f617602356efdbD05908a07AA788";

describe("runDeployImutableFromRelease", () => {
  test("requires rpc-url", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
    });
    await expect(runDeployImutableFromRelease(out, options)).rejects.toThrow(
      "requires --rpc-url",
    );
  });

  test("rejects safe-publish", async () => {
    const out = createCaptureOut();
    const options = parseDeployImutableFromReleaseOptions({
      "source-root": ROOT,
      "from-release": "v0.4.0",
      "bootstrap-alg": "ks256",
      "bootstrap-ks256-signer": OWNER,
      "deploy-key": KEY_A,
      "rpc-url": "http://127.0.0.1:8545",
      "safe-publish": true,
    });
    await expect(runDeployImutableFromRelease(out, options)).rejects.toThrow(
      "EOA-only",
    );
  });
});

describe("parseDeployImutableFromReleaseOptions", () => {
  test("requires from-release", () => {
    expect(() =>
      parseDeployImutableFromReleaseOptions({
        "source-root": ROOT,
        "bootstrap-alg": "ks256",
        "bootstrap-ks256-signer": OWNER,
        "deploy-key": KEY_A,
      }),
    ).toThrow("--from-release");
  });
});
