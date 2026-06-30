import { describe, expect, test } from "bun:test";
import { logIdToHex32, uupsProxySaltString } from "../uups-proxy-salt.js";

describe("logIdToHex32", () => {
  test("accepts dashed UUID and bare hex32", () => {
    expect(logIdToHex32("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")).toBe(
      "a1b2c3d4e5f67890abcdef1234567890",
    );
    expect(logIdToHex32("a1b2c3d4e5f67890abcdef1234567890")).toBe(
      "a1b2c3d4e5f67890abcdef1234567890",
    );
  });

  test("rejects invalid logId", () => {
    expect(() => logIdToHex32("not-a-log-id")).toThrow(/logId must be/);
  });
});

describe("uupsProxySaltString", () => {
  test("uses v1 scheme prefix", () => {
    const salt = uupsProxySaltString("00000000-0000-4000-8000-000000000000");
    expect(salt).toBe(
      "forestrie.eth/univocity/UUPSUnivocity/v1/00000000000040008000000000000000",
    );
  });
});
