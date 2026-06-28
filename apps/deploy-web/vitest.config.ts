import { defineConfig } from "vitest/config";

const testingPrivyAppId = process.env.TESTING_PRIVY_APP_ID ?? "";
const testingPrivyClientId = process.env.TESTING_PRIVY_CLIENT_ID ?? "";
const publicE2ePrivy = process.env.PUBLIC_E2E_PRIVY ?? "";

export default defineConfig({
  define: {
    "import.meta.env.PUBLIC_E2E_PRIVY": JSON.stringify(publicE2ePrivy),
    "import.meta.env.TESTING_PRIVY_APP_ID": JSON.stringify(testingPrivyAppId),
    "import.meta.env.TESTING_PRIVY_CLIENT_ID": JSON.stringify(
      testingPrivyClientId,
    ),
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup-privy-dom.ts"],
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
