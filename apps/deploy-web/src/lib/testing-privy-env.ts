/** Read testing Privy env from Vite `import.meta.env` or Doppler-injected `process.env`. */
function readEnv(name: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" ? process.env[name]?.trim() : undefined;
  if (fromProcess) {
    return fromProcess;
  }
  const fromVite = (import.meta.env as Record<string, string | undefined>)[
    name
  ]?.trim();
  return fromVite || undefined;
}

export function getTestingPrivyAppId(): string | undefined {
  return readEnv("TESTING_PRIVY_APP_ID");
}

export function getTestingPrivyClientId(): string | undefined {
  return readEnv("TESTING_PRIVY_CLIENT_ID");
}

/** JWKS URL for verifying Privy access/identity tokens (test tooling only). */
export function getTestingPrivyJwksUrl(): string | undefined {
  return readEnv("TESTING_PRIVY_APP_JWKS") ?? readEnv("TESTING_PRIVY_JWKS");
}

export function getTestingPrivyAccount0():
  | {
      email: string;
      otp: string;
      phone?: string;
    }
  | undefined {
  const email = readEnv("TESTING_PRIVY_ACCOUNT0_EMAIL");
  const otp = readEnv("TESTING_PRIVY_ACCOUNT0_OTP");
  if (!email || !otp) {
    return undefined;
  }
  const phone = readEnv("TESTING_PRIVY_ACCOUNT0_PHONE");
  return phone ? { email, otp, phone } : { email, otp };
}

export function haveTestingPrivyCredentials(): boolean {
  return (
    getTestingPrivyAppId() !== undefined &&
    getTestingPrivyAccount0() !== undefined &&
    getTestingPrivyJwksUrl() !== undefined
  );
}
