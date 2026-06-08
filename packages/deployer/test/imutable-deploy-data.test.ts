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
  test("appends abi.encode(int64, bytes) for KS256 (20-byte key)", () => {
    const data = buildImutableDeploymentData(CREATION, ALG_KS256, KS_KEY);
    const expectedArgs = encodeAbiParameters(
      [{ type: "int64" }, { type: "bytes" }],
      [ALG_KS256, KS_KEY],
    );
    expect(data).toBe(concat([CREATION, expectedArgs]));
    // negative alg encodes as two's complement int64 in a 32-byte word.
    expect(
      expectedArgs.startsWith(
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffefef9",
      ),
    ).toBe(true);
  });

  test("encodes ES256 (64-byte key)", () => {
    const data = buildImutableDeploymentData(CREATION, ALG_ES256, ES_KEY);
    expect(data.startsWith(CREATION)).toBe(true);
    expect(size(ES_KEY)).toBe(64);
  });
});

describe("predictCreate2Address", () => {
  test("matches the ff||deployer||salt||keccak(initCode) formula", () => {
    const deploymentData = buildImutableDeploymentData(
      CREATION,
      ALG_KS256,
      KS_KEY,
    );
    const predicted = predictCreate2Address(
      DEFAULT_CREATE_CALL,
      SALT,
      deploymentData,
    );

    const manual = getCreate2Address({
      from: DEFAULT_CREATE_CALL,
      salt: SALT,
      bytecodeHash: keccak256(deploymentData),
    });
    expect(predicted).toBe(manual);
  });
});

describe("encodePerformCreate2Calldata / predictImutableFromPerformCreate2", () => {
  test("calldata carries the performCreate2 selector and round-trips", () => {
    const deploymentData = buildImutableDeploymentData(
      CREATION,
      ALG_KS256,
      KS_KEY,
    );
    const calldata = encodePerformCreate2Calldata(deploymentData, SALT);
    expect(calldata.startsWith("0x4847be6f")).toBe(true);

    const predicted = predictImutableFromPerformCreate2(
      DEFAULT_CREATE_CALL,
      calldata,
    );
    expect(predicted).toBe(
      predictCreate2Address(DEFAULT_CREATE_CALL, SALT, deploymentData),
    );
  });

  test("returns null for non-performCreate2 calldata", () => {
    expect(
      predictImutableFromPerformCreate2(DEFAULT_CREATE_CALL, "0xdeadbeef"),
    ).toBe(null);
  });
});

describe("defaultSafeBatchSalt", () => {
  test("matches keccak256(abi.encodePacked(label, safe))", () => {
    const safe = "0x1528b86ff561f617602356efdbD05908a07AA788";
    const salt = defaultSafeBatchSalt(safe);
    const manual = keccak256(
      encodePacked(
        ["string", "address"],
        ["forestrie.eth/univocity/ImutableUnivocity/safe/", safe],
      ),
    );
    expect(salt).toBe(manual);
  });
});
