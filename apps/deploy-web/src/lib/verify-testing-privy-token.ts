import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verify a Privy access or identity JWT against the testing app JWKS.
 * Test-only — do not use in production deploy paths.
 */
export async function verifyTestingPrivyToken(
  token: string,
  options: { appId: string; jwksUrl: string },
): Promise<{ sub: string }> {
  const jwks = createRemoteJWKSet(new URL(options.jwksUrl));
  const { payload } = await jwtVerify(token, jwks, {
    audience: options.appId,
  });
  const sub = payload.sub;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new Error("Privy token missing sub claim");
  }
  return { sub };
}
