import { describe, expect, test } from "bun:test";
import { size } from "viem";
import {
  derToPem,
  es256CoordsToKey,
  generateEs256BootstrapKey,
  generateKs256BootstrapKey,
  ks256AddressToKey,
  parseEs256Pem,
  parseEs256Pub64,
  resolveBootstrapKey,
} from "../bootstrap-key.js";
import { base64UrlToBytes, bytesToHexPrefixed } from "../encoding.js";
import { ALG_ES256, ALG_KS256 } from "../deploy-constants.js";

describe("parseEs256Pem", () => {
  test("decodes pkcs8 private PEM to the public x/y coords", async () => {
    const kp = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
    const jwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
    const pem = derToPem(pkcs8, "PRIVATE KEY");

    const coords = await parseEs256Pem(pem);
    expect(coords.x).toBe(bytesToHexPrefixed(base64UrlToBytes(jwk.x!)));
    expect(coords.y).toBe(bytesToHexPrefixed(base64UrlToBytes(jwk.y!)));
  });

  test("throws on non-PEM input", async () => {
    await expect(parseEs256Pem("not a pem")).rejects.toThrow(
      "must be inline PEM text",
    );
  });
});

describe("resolveBootstrapKey", () => {
  test("ks256 from signer", async () => {
    const result = await resolveBootstrapKey({
      alg: "ks256",
      signer: "0x1528b86ff561f617602356efdbD05908a07AA788",
    });
    expect(result.algId).toBe(ALG_KS256);
    expect(size(result.key)).toBe(20);
  });

  test("es256 from x/y", async () => {
    const result = await resolveBootstrapKey({
      alg: "es256",
      x: `0x${"aa".repeat(32)}`,
      y: `0x${"bb".repeat(32)}`,
    });
    expect(result.algId).toBe(ALG_ES256);
    expect(size(result.key)).toBe(64);
  });
});

describe("generateKs256BootstrapKey", () => {
  test("yields a 20-byte bootstrap address", () => {
    const generated = generateKs256BootstrapKey();
    expect(size(ks256AddressToKey(generated.address))).toBe(20);
  });
});

describe("parseEs256Pub64", () => {
  test("splits 64-byte x||y hex", () => {
    const x = "11".repeat(32);
    const y = "22".repeat(32);
    const coords = parseEs256Pub64(`0x${x}${y}`);
    expect(es256CoordsToKey(coords.x, coords.y)).toBe(`0x${x}${y}`);
  });
});

describe("generateEs256BootstrapKey", () => {
  test("round-trips through parseEs256Pem", async () => {
    const generated = await generateEs256BootstrapKey();
    const coords = await parseEs256Pem(generated.pem);
    expect(coords.x).toBe(generated.x);
    expect(coords.y).toBe(generated.y);
  });
});
