import { describe, expect, test } from "bun:test";
import type { Address } from "viem";
import { predictCreate3Address } from "../create3-address.js";

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
