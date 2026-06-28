import { bytesToHex, type Hex } from "viem";

/** Base64 (standard) encode for PEM wrapping. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** Decode standard base64 into bytes. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** Decode base64url (JWK x/y) into bytes. */
export function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  return base64ToBytes(b64 + pad);
}

/** Hex string from raw bytes (with 0x prefix). */
export function bytesToHexPrefixed(bytes: Uint8Array): Hex {
  return bytesToHex(bytes);
}
