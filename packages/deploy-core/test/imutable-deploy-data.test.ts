import { describe, expect, test } from "bun:test";
import {
  concat,
  encodeAbiParameters,
  encodePacked,
  getCreate2Address,
  keccak256,
  size,
  type Hex,
} from "viem";
import {
  ALG_ES256,
  ALG_KS256,
  DEFAULT_CREATE_CALL,
} from "../deploy-constants.js";
import {
  buildImutableDeploymentData,
  defaultSafeBatchSalt,
  encodePerformCreate2Calldata,
  predictCreate2Address,
  predictImutableFromPerformCreate2,
} from "../imutable-deploy-data.js";

const CREATION = "0x6001" as Hex;
const KS_KEY = "0x1528b86ff561f617602356efdbd05908a07aa788" as Hex;
const ES_KEY = `0x${"aa".repeat(32)}${"bb".repeat(32)}` as Hex;
const SALT = `0x${"cd".repeat(32)}` as Hex;

describe("buildImutableDeploymentData", () => {
  test("appends abi.encode(int64, bytes) for KS256", () => {
    const data = buildImutableDeploymentData(CREATION, ALG_KS256, KS_KEY);
    const expectedArgs = encodeAbiParameters(
      [{ type: "int64" }, { type: "bytes" }],
      [ALG_KS256, KS_KEY],
    );
    expect(data).toBe(concat([CREATION, expectedArgs]));
  });

  test("encodes ES256 (64-byte key)", () => {
    const data = buildImutableDeploymentData(CREATION, ALG_ES256, ES_KEY);
    expect(data.startsWith(CREATION)).toBe(true);
    expect(size(ES_KEY)).toBe(64);
  });
});

describe("predictImutableFromPerformCreate2", () => {
  test("round-trips performCreate2 calldata", () => {
    const deploymentData = buildImutableDeploymentData(
      CREATION,
      ALG_KS256,
      KS_KEY,
    );
    const calldata = encodePerformCreate2Calldata(deploymentData, SALT);
    expect(
      predictImutableFromPerformCreate2(DEFAULT_CREATE_CALL, calldata),
    ).toBe(predictCreate2Address(DEFAULT_CREATE_CALL, SALT, deploymentData));
  });
});

describe("defaultSafeBatchSalt", () => {
  test("matches keccak256(abi.encodePacked(label, safe))", () => {
    const safe = "0x1528b86ff561f617602356efdbD05908a07AA788";
    expect(defaultSafeBatchSalt(safe)).toBe(
      keccak256(
        encodePacked(
          ["string", "address"],
          ["forestrie.eth/univocity/ImutableUnivocity/safe/", safe],
        ),
      ),
    );
  });
});
