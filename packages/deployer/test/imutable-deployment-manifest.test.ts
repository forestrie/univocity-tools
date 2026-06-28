import { describe, expect, test } from "bun:test";
import {
  parseImutableDeploymentManifest,
  serializeImutableDeploymentManifest,
} from "../imutable-deployment-manifest.js";

const SAMPLE = {
  kind: "imutable-deployment",
  version: 1,
  bootstrapAlg: "ks256",
  chainId: 84532,
  imutableUnivocity: "0x1528b86ff561f617602356efdbD05908a07AA788",
  publishMode: "eoa",
  from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
} as const;

describe("imutable deployment manifest", () => {
  test("round-trips JSON", () => {
    const raw = serializeImutableDeploymentManifest(SAMPLE);
    expect(parseImutableDeploymentManifest(raw)).toEqual(SAMPLE);
  });

  test("rejects deploy proposal kind", () => {
    expect(() =>
      parseImutableDeploymentManifest(
        JSON.stringify({ ...SAMPLE, kind: "deploy-imutable" }),
      ),
    ).toThrow(/kind must be/);
  });
});
