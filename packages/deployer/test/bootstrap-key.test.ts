import { describe, expect, test } from "bun:test";
import { size } from "viem";
import {
  es256CoordsToKey,
  ks256AddressToKey,
  parseEs256Pem,
  parseEs256Pub64,
  resolveBootstrapKey,
} from "../bootstrap-key.js";
import { ALG_ES256, ALG_KS256 } from "../deploy-constants.js";

function derToPem(der: ArrayBuffer | Uint8Array, label: string): string {
  const bytes = der instanceof Uint8Array ? der : new Uint8Array(der);
  const b64 = Buffer.from(bytes).toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

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
    expect(coords.x).toBe(
      `0x${Buffer.from(jwk.x as string, "base64url").toString("hex")}`,
    );
    expect(coords.y).toBe(
      `0x${Buffer.from(jwk.y as string, "base64url").toString("hex")}`,
    );
  });

  test("decodes spki public PEM", async () => {
    const kp = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const spki = await crypto.subtle.exportKey("spki", kp.publicKey);
    const pem = derToPem(spki, "PUBLIC KEY");
    const coords = await parseEs256Pem(pem);
    expect(size(coords.x)).toBe(32);
    expect(size(coords.y)).toBe(32);
  });

  test("throws on non-PEM input", async () => {
    await expect(parseEs256Pem("not a pem")).rejects.toThrow(
      "must be inline PEM text",
    );
  });
});

describe("parseEs256Pub64", () => {
  test("splits 64-byte x||y hex", () => {
    const x = "11".repeat(32);
    const y = "22".repeat(32);
    const coords = parseEs256Pub64(`0x${x}${y}`);
    expect(coords.x).toBe(`0x${x}`);
    expect(coords.y).toBe(`0x${y}`);
    expect(size(es256CoordsToKey(coords.x, coords.y))).toBe(64);
  });

  test("rejects wrong length", () => {
    expect(() => parseEs256Pub64("0x0102")).toThrow("64 bytes");
  });
});

describe("es256CoordsToKey", () => {
  test("concatenates x||y into 64 bytes", () => {
    const x = `0x${"11".repeat(32)}`;
    const y = `0x${"22".repeat(32)}`;
    const key = es256CoordsToKey(x, y);
    expect(key).toBe(`0x${"11".repeat(32)}${"22".repeat(32)}`);
    expect(size(key)).toBe(64);
  });

  test("left-pads short coordinates to 32 bytes", () => {
    const key = es256CoordsToKey("0x01", "0x02");
    expect(size(key)).toBe(64);
    expect(key.endsWith("02")).toBe(true);
  });

  test("rejects oversized coordinates", () => {
    expect(() => es256CoordsToKey(`0x${"11".repeat(33)}`, "0x02")).toThrow(
      "at most 32 bytes",
    );
  });
});

describe("ks256AddressToKey", () => {
  test("returns the 20-byte address (lowercased)", () => {
    const key = ks256AddressToKey(
      "0x1528b86ff561f617602356efdbD05908a07AA788",
    );
    expect(key).toBe("0x1528b86ff561f617602356efdbd05908a07aa788");
    expect(size(key)).toBe(20);
  });
});

describe("resolveBootstrapKey", () => {
  test("es256 from x/y", async () => {
    const result = await resolveBootstrapKey({
      alg: "es256",
      x: `0x${"aa".repeat(32)}`,
      y: `0x${"bb".repeat(32)}`,
    });
    expect(result.alg).toBe("es256");
    expect(result.algId).toBe(ALG_ES256);
    expect(size(result.key)).toBe(64);
  });

  test("es256 from pub64", async () => {
    const x = "aa".repeat(32);
    const y = "bb".repeat(32);
    const result = await resolveBootstrapKey({
      alg: "es256",
      pub64: `0x${x}${y}`,
    });
    expect(result.key).toBe(`0x${x}${y}`);
  });

  test("es256 prefers explicit x/y over pub64", async () => {
    const result = await resolveBootstrapKey({
      alg: "es256",
      x: `0x${"01".repeat(32)}`,
      y: `0x${"02".repeat(32)}`,
      pub64: `0x${"aa".repeat(64)}`,
    });
    expect(result.key).toBe(`0x${"01".repeat(32)}${"02".repeat(32)}`);
  });

  test("es256 SEC1 EC PRIVATE KEY PEM (OpenSSL / Doppler shape)", async () => {
    const derHex =
      "3077020101042081ab232efca39fe9141ac96e8129c99447b4e583b22abb34e82fd4c70d3e7243a00a06082a8648ce3d030107a14403420004" +
      "823df30642534844c4b8ea9f60a53b2545d634b69b36d87d126baa8c760d930b" +
      "88e47bdd430434321aabe07ac8a6aeb103df294c984c35147340a11d894e43c6";
    const pem = derToPem(Buffer.from(derHex, "hex"), "EC PRIVATE KEY");
    const result = await resolveBootstrapKey({ alg: "es256", pem });
    expect(result.key).toBe(`0x${derHex.slice(-128)}`);
  });

  test("es256 falls back to pub64 when PEM is invalid", async () => {
    const x = "cc".repeat(32);
    const y = "dd".repeat(32);
    const result = await resolveBootstrapKey({
      alg: "es256",
      pem: "-----BEGIN EC PRIVATE KEY-----\nnot-valid\n-----END EC PRIVATE KEY-----",
      pub64: `0x${x}${y}`,
    });
    expect(result.key).toBe(`0x${x}${y}`);
  });

  test("ks256 from signer", async () => {
    const result = await resolveBootstrapKey({
      alg: "ks256",
      signer: "0x1528b86ff561f617602356efdbD05908a07AA788",
    });
    expect(result.alg).toBe("ks256");
    expect(result.algId).toBe(ALG_KS256);
    expect(size(result.key)).toBe(20);
  });

  test("es256 without material throws", async () => {
    await expect(resolveBootstrapKey({ alg: "es256" })).rejects.toThrow(
      "ES256 bootstrap requires",
    );
  });

  test("ks256 without signer throws", async () => {
    await expect(
      resolveBootstrapKey({ alg: "ks256", signer: "" }),
    ).rejects.toThrow("KS256 bootstrap requires");
  });
});
