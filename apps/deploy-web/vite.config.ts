import { defineConfig } from "vite";

/** Injected at build/dev time from Doppler or shell (not VITE_-prefixed). */
const testingPrivyAppId = process.env.TESTING_PRIVY_APP_ID ?? "";
const testingPrivyClientId = process.env.TESTING_PRIVY_CLIENT_ID ?? "";
const publicE2ePrivy = process.env.PUBLIC_E2E_PRIVY ?? "";

export default defineConfig(async ({ command }) => ({
  root: ".",
  plugins:
    command === "serve"
      ? [(await import("./dev/manifest-api-plugin.js")).manifestApiPlugin()]
      : [],
  define: {
    "import.meta.env.PUBLIC_E2E_PRIVY": JSON.stringify(publicE2ePrivy),
    "import.meta.env.TESTING_PRIVY_APP_ID": JSON.stringify(testingPrivyAppId),
    "import.meta.env.TESTING_PRIVY_CLIENT_ID": JSON.stringify(
      testingPrivyClientId,
    ),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5175,
  },
}));
