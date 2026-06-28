import { describe, expect, test } from "vitest";
import { bootstrapAckRequired } from "../src/lib/bootstrap-guards.js";

describe("bootstrapAckRequired", () => {
  test("requires ack for generated KS256 material", () => {
    expect(
      bootstrapAckRequired({
        bootstrapAlg: "ks256",
        es256Pem: "",
        ks256PrivateKey: "0xabc",
      }),
    ).toBe(true);
  });

  test("does not require ack for manual KS256 address only", () => {
    expect(
      bootstrapAckRequired({
        bootstrapAlg: "ks256",
        es256Pem: "",
        ks256PrivateKey: null,
      }),
    ).toBe(false);
  });

  test("requires ack when ES256 PEM is present", () => {
    expect(
      bootstrapAckRequired({
        bootstrapAlg: "es256",
        es256Pem: "-----BEGIN PRIVATE KEY-----\n",
        ks256PrivateKey: null,
      }),
    ).toBe(true);
  });
});
