import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  getTestingPrivyAccount0,
  getTestingPrivyAppId,
  getTestingPrivyJwksUrl,
  haveTestingPrivyCredentials,
} from "../src/lib/testing-privy-env.js";
import { verifyTestingPrivyToken } from "../src/lib/verify-testing-privy-token.js";
import {
  getPrivyAccessToken,
  getPrivyClient,
  getPrivyIdentityToken,
  getPrivyWalletAddress,
  loginWithPrivyEmail,
  logoutPrivy,
  resetPrivyClientForTests,
} from "../src/lib/privy.js";

const havePrivy = haveTestingPrivyCredentials();

describe.skipIf(!havePrivy)("Privy testing app integration", () => {
  beforeAll(async () => {
    resetPrivyClientForTests();
    const account = getTestingPrivyAccount0()!;
    await loginWithPrivyEmail(account.email, {
      otp: account.otp,
      skipSendCode: true,
      createOnLogin: "off",
    });
  }, 30_000);

  afterAll(async () => {
    try {
      await logoutPrivy();
    } catch {
      // ignore
    }
    resetPrivyClientForTests();
  });

  test("authenticated user matches TESTING_PRIVY_ACCOUNT0_EMAIL", async () => {
    const privy = await getPrivyClient();
    const { user } = await privy.user.get();
    expect(user).toBeTruthy();
    const emails =
      user?.linked_accounts
        ?.filter((account) => account.type === "email")
        .map((account) => account.address?.toLowerCase()) ?? [];
    expect(emails).toContain(getTestingPrivyAccount0()!.email.toLowerCase());
  });

  test("embedded wallet address when present on test user", async () => {
    const address = await getPrivyWalletAddress();
    if (address === null) {
      // Test user may be email-only until first browser login creates a wallet.
      return;
    }
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("access token verifies against TESTING_PRIVY_APP_JWKS", async () => {
    const accessToken = await getPrivyAccessToken();
    expect(accessToken).toBeTruthy();
    const { sub } = await verifyTestingPrivyToken(accessToken!, {
      appId: getTestingPrivyAppId()!,
      jwksUrl: getTestingPrivyJwksUrl()!,
    });
    expect(sub.length).toBeGreaterThan(0);
  });

  test("identity token verifies when enabled in Privy dashboard", async () => {
    const identityToken = await getPrivyIdentityToken();
    expect(identityToken).toBeTruthy();
    const { sub } = await verifyTestingPrivyToken(identityToken!, {
      appId: getTestingPrivyAppId()!,
      jwksUrl: getTestingPrivyJwksUrl()!,
    });
    expect(sub.length).toBeGreaterThan(0);
  });
});

describe("Privy integration prerequisites", () => {
  test("skips integration suite in CI without Doppler secrets", () => {
    if (havePrivy) {
      expect(getTestingPrivyAppId()).toBeTruthy();
      expect(getTestingPrivyJwksUrl()).toMatch(/^https?:\/\//);
    } else {
      expect(havePrivy).toBe(false);
    }
  });
});
