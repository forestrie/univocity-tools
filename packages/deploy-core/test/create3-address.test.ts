import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Address } from "viem";
import { predictCreate3Address } from "../create3-address.js";
import { logIdToHex32, uupsProxySaltString } from "../uups-proxy-salt.js";

const vector = JSON.parse(
  readFileSync(
    join(import.meta.dir, "fixtures/uups-salt-parity.vector.json"),
    "utf8",
  ),
) as {
  logId: string;
  logIdHex32: string;
  saltString: string;
  deployer: Address;
  factory: Address;
  expectedProxyAddress: Address;
};

describe("predictCreate3Address", () => {
  test("matches deployment.json ephemeral UUPSUnivocity vector", () => {
    const deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
    const factory = "0x988e1Ef32F200E84197266eC0Fd36cC9a1d849dF" as Address;
    const salt = "forestrie.eth/univocity/UUPSUnivocity/0";
    const predicted = predictCreate3Address(deployer, salt, factory);
    expect(predicted.toLowerCase()).toBe(
      "0x33e2ae2ceb11418796b06f6c041488080ff7504b",
    );
  });
});

describe("uupsProxySaltString", () => {
  test("derives canonical v1 salt from a UUID logId", () => {
    expect(uupsProxySaltString(vector.logId)).toBe(vector.saltString);
    expect(logIdToHex32(vector.logId)).toBe(vector.logIdHex32);
  });

  test("matches shared counterfactual parity vector (ADR-0042)", () => {
    const predicted = predictCreate3Address(
      vector.deployer,
      vector.saltString,
      vector.factory,
    );
    expect(predicted.toLowerCase()).toBe(
      vector.expectedProxyAddress.toLowerCase(),
    );
    expect(uupsProxySaltString(vector.logId)).toBe(vector.saltString);
  });
});
