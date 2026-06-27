import fs from "node:fs/promises";

/** SHA-256 digest of a file (lowercase hex, no 0x prefix). */
export async function sha256FileHex(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Parse a shasum sidecar (first field is the digest). */
export function parseSha256Sidecar(contents: string): string {
  const line = contents.trim().split("\n")[0]?.trim() ?? "";
  const digest = line.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error("invalid sha256 sidecar: expected 64-char hex digest");
  }
  return digest;
}

/** Verify a file against a shasum sidecar; throws on mismatch. */
export async function verifyFileSha256Sidecar(
  filePath: string,
  sidecarPath: string,
): Promise<void> {
  const sidecar = await fs.readFile(sidecarPath, "utf8");
  const expected = parseSha256Sidecar(sidecar);
  const actual = await sha256FileHex(filePath);
  if (actual !== expected) {
    throw new Error(
      `sha256 sidecar mismatch for ${filePath}: expected ${expected}, got ${actual}`,
    );
  }
}
