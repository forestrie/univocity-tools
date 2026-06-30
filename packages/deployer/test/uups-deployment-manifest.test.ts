import { describe, expect, test } from "bun:test";
import { parseUupsDeploymentManifestJson } from "../uups-deployment-manifest.js";

describe("parseUupsDeploymentManifestJson", () => {
  test("round-trips counterfactual manifest fields", () => {
    const manifest = parseUupsDeploymentManifestJson(
      JSON.stringify({
        kind: "uups-deployment",
        version: 1,
        chainId: 84532,
        deployer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        logId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        saltString:
          "forestrie.eth/univocity/UUPSUnivocity/v1/a1b2c3d4e5f67890abcdef1234567890",
        proxy: "0xbFb9Ef37B28BD71a89a6D8aFe27eB368CEF17347",
        implementation: "0x2222222222222222222222222222222222222222",
        upgradeAdmin: "0x1528b86ff561f617602356efdbD05908a07AA788",
        bootstrapAlg: "ks256",
      }),
    );
    expect(manifest.logId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(manifest.saltString).toContain("/v1/");
    expect(manifest.deployer).toBe(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    );
  });
});
