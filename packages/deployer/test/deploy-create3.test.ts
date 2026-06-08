import { describe, expect, test } from "bun:test";
import {
  buildDeployCalldata,
  DEFAULT_CREATE3_SALT,
  encodeArachnidDeployCalldata,
  hashCreate3SaltString,
  hasContractCode,
  normalizePrivateKey,
  resolveCreate3Salt,
} from "../create3-deploy-helpers.js";
import { parseFactoryBytecodeFromArtifact } from "../read-factory-bytecode.js";

describe("hashCreate3SaltString", () => {
  test("hashes salt string with keccak256(bytes)", () => {
    const hash = hashCreate3SaltString(DEFAULT_CREATE3_SALT);
    expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(hashCreate3SaltString(DEFAULT_CREATE3_SALT)).toBe(hash);
  });
});

describe("encodeArachnidDeployCalldata", () => {
  test("concatenates salt hash and bytecode", () => {
    const bytecode = "0x6001" as const;
    const calldata = encodeArachnidDeployCalldata(DEFAULT_CREATE3_SALT, bytecode);
    const saltHash = hashCreate3SaltString(DEFAULT_CREATE3_SALT);
    expect(calldata).toBe(`${saltHash}6001`);
  });

  test("buildDeployCalldata matches encodeArachnidDeployCalldata", () => {
    const bytecode = "0xdead" as const;
    expect(buildDeployCalldata(DEFAULT_CREATE3_SALT, bytecode)).toBe(
      encodeArachnidDeployCalldata(DEFAULT_CREATE3_SALT, bytecode),
    );
  });
});

describe("hasContractCode", () => {
  test("detects deployed code", () => {
    expect(hasContractCode("0x6001")).toBe(true);
    expect(hasContractCode("0x")).toBe(false);
    expect(hasContractCode("")).toBe(false);
    expect(hasContractCode(undefined)).toBe(false);
  });
});

describe("normalizePrivateKey", () => {
  test("adds 0x prefix when missing", () => {
    expect(normalizePrivateKey("abc")).toBe("0xabc");
    expect(normalizePrivateKey("0xabc")).toBe("0xabc");
  });
});

describe("resolveCreate3Salt", () => {
  test("defaults to univocity-create3/1", () => {
    expect(resolveCreate3Salt({})).toBe(DEFAULT_CREATE3_SALT);
  });

  test("reads --create3-salt flag", () => {
    expect(resolveCreate3Salt({ "create3-salt": "custom/salt" })).toBe(
      "custom/salt",
    );
  });
});

describe("parseFactoryBytecodeFromArtifact", () => {
  test("extracts bytecode.object", () => {
    expect(
      parseFactoryBytecodeFromArtifact({
        bytecode: { object: "0x6001" },
      }),
    ).toEqual({ bytecode: "0x6001" });
  });

  test("throws on invalid artifact", () => {
    expect(() => parseFactoryBytecodeFromArtifact(null)).toThrow(
      "CREATE3Factory artifact must be a JSON object",
    );
  });
});
