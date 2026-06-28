import {
  concat,
  getAddress,
  isHex,
  pad,
  size,
  type Address,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ALG_ES256, ALG_KS256 } from "./deploy-constants.js";
import {
  base64ToBytes,
  base64UrlToBytes,
  bytesToBase64,
  bytesToHexPrefixed,
} from "./encoding.js";

export type BootstrapAlg = "es256" | "ks256";

/** Resolved bootstrap key ready for constructor ABI encoding. */
export type BootstrapKey = {
  alg: BootstrapAlg;
  /** int64 COSE alg id (ALG_ES256 / ALG_KS256). */
  algId: bigint;
  /** Constructor `bytes`: 64-byte `x||y` (ES256) or 20-byte address (KS256). */
  key: Hex;
};

export type BootstrapKeyInput =
  | { alg: "es256"; pem?: string; pub64?: string; x?: string; y?: string }
  | { alg: "ks256"; signer: string };

/** Normalize a P-256 coordinate to a 32-byte hex value. */
function normalizeCoord(raw: string, label: string): Hex {
  const hex = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  if (!isHex(hex)) {
    throw new Error(`${label} must be hex`);
  }
  if (size(hex) > 32) {
    throw new Error(`${label} must be at most 32 bytes, got ${size(hex)}`);
  }
  return pad(hex, { size: 32 });
}

/** Concatenate P-256 x and y coordinates into the 64-byte ES256 key. */
export function es256CoordsToKey(x: string, y: string): Hex {
  return concat([normalizeCoord(x, "ES256 x"), normalizeCoord(y, "ES256 y")]);
}

/**
 * Parse a 64-byte uncompressed P-256 public key (`x||y`) from hex. Accepts
 * `BOOTSTRAP_PUB_ES256`-style values (with or without `0x`).
 */
export function parseEs256Pub64(raw: string): { x: Hex; y: Hex } {
  const hex = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  if (!isHex(hex)) {
    throw new Error("ES256 public key must be hex");
  }
  if (size(hex) !== 64) {
    throw new Error(
      `ES256 public key must be 64 bytes (x||y), got ${size(hex)}`,
    );
  }
  return {
    x: `0x${hex.slice(2, 66)}` as Hex,
    y: `0x${hex.slice(66, 130)}` as Hex,
  };
}

/** Wrap DER bytes in a PEM label (PKCS#8 / SPKI / etc.). */
export function derToPem(
  der: ArrayBuffer | Uint8Array,
  label: string,
): string {
  const bytes = der instanceof Uint8Array ? der : new Uint8Array(der);
  const b64 = bytesToBase64(bytes);
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

function pemBodyToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64ToBytes(body);
}

/**
 * Extract the uncompressed public point from a SEC1 `EC PRIVATE KEY` DER
 * blob (`0x04 || x(32) || y(32)` in the `[1]` bit string).
 */
function parseSec1EcPrivateKeyDer(der: Uint8Array): { x: Hex; y: Hex } {
  for (let i = der.length - 65; i >= 0; i--) {
    if (der[i] !== 0x04) {
      continue;
    }
    const x = der.subarray(i + 1, i + 33);
    const y = der.subarray(i + 33, i + 65);
    if (x.length === 32 && y.length === 32) {
      return {
        x: bytesToHexPrefixed(x),
        y: bytesToHexPrefixed(y),
      };
    }
  }
  throw new Error("SEC1 EC private key DER missing public point");
}

async function parseEs256Pkcs8OrSpkiPem(
  pem: string,
  format: "pkcs8" | "spki",
): Promise<{ x: Hex; y: Hex }> {
  const usages: ("sign" | "verify")[] =
    format === "pkcs8" ? ["sign"] : ["verify"];
  const der = pemBodyToDer(pem);
  const key = await crypto.subtle.importKey(
    format,
    new Uint8Array(der),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    usages,
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  if (jwk.x === undefined || jwk.y === undefined) {
    throw new Error("ES256 PEM did not yield P-256 x/y coordinates");
  }
  return {
    x: bytesToHexPrefixed(base64UrlToBytes(jwk.x)),
    y: bytesToHexPrefixed(base64UrlToBytes(jwk.y)),
  };
}

/**
 * Decode an inline PEM (PKCS#8 private, SEC1 EC private, or SPKI public)
 * P-256 key into its public `x`/`y` coordinates.
 */
export async function parseEs256Pem(pem: string): Promise<{ x: Hex; y: Hex }> {
  if (!pem.includes("BEGIN")) {
    throw new Error("ES256 PEM must be inline PEM text");
  }
  if (pem.includes("EC PRIVATE KEY")) {
    return parseSec1EcPrivateKeyDer(pemBodyToDer(pem));
  }
  const format: "pkcs8" | "spki" = pem.includes("PRIVATE KEY")
    ? "pkcs8"
    : "spki";
  return parseEs256Pkcs8OrSpkiPem(pem, format);
}

async function resolveEs256Coords(
  input: Extract<BootstrapKeyInput, { alg: "es256" }>,
): Promise<{ x: string; y: string }> {
  if (input.x !== undefined && input.y !== undefined) {
    return { x: input.x, y: input.y };
  }

  let pubFallback: { x: Hex; y: Hex } | undefined;
  if (input.pub64 !== undefined && input.pub64.trim().length > 0) {
    pubFallback = parseEs256Pub64(input.pub64);
    if (
      input.x === undefined &&
      input.y === undefined &&
      input.pem === undefined
    ) {
      return pubFallback;
    }
  }

  if (input.pem !== undefined && input.pem.trim().length > 0) {
    try {
      return await parseEs256Pem(input.pem);
    } catch (error) {
      if (pubFallback !== undefined) {
        return pubFallback;
      }
      throw error;
    }
  }

  if (pubFallback !== undefined) {
    return pubFallback;
  }

  throw new Error(
    "ES256 bootstrap requires PEM, pub64, or both x and y coordinates",
  );
}

/** 20-byte address bytes for a KS256 bootstrap signer. */
export function ks256AddressToKey(signer: string): Hex {
  return getAddress(signer).toLowerCase() as Hex;
}

/** Generate an ephemeral P-256 ES256 bootstrap keypair (PKCS#8 PEM + public x/y). */
export async function generateEs256BootstrapKey(): Promise<{
  pem: string;
  x: Hex;
  y: Hex;
}> {
  const kp = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
  const jwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  if (jwk.x === undefined || jwk.y === undefined) {
    throw new Error("generated ES256 key did not yield P-256 x/y coordinates");
  }
  return {
    pem: derToPem(pkcs8, "PRIVATE KEY"),
    x: bytesToHexPrefixed(base64UrlToBytes(jwk.x)),
    y: bytesToHexPrefixed(base64UrlToBytes(jwk.y)),
  };
}

/** Generate an ephemeral secp256k1 KS256 bootstrap EOA. */
export function generateKs256BootstrapKey(): {
  privateKey: Hex;
  address: Address;
} {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAccount(privateKey).address;
  return { privateKey, address };
}

/** Resolve the bootstrap alg + opaque key bytes for the constructor. */
export async function resolveBootstrapKey(
  input: BootstrapKeyInput,
): Promise<BootstrapKey> {
  if (input.alg === "es256") {
    const { x, y } = await resolveEs256Coords(input);
    return { alg: "es256", algId: ALG_ES256, key: es256CoordsToKey(x, y) };
  }
  if (input.signer === undefined || input.signer.trim().length === 0) {
    throw new Error("KS256 bootstrap requires a signer address");
  }
  return {
    alg: "ks256",
    algId: ALG_KS256,
    key: ks256AddressToKey(input.signer),
  };
}
