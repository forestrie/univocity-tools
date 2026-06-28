import { defineConfig } from "vite";
import { manifestApiPlugin } from "./dev/manifest-api-plugin.js";

/** Injected at build/dev time from Doppler or shell (not VITE_-prefixed). */
const testingPrivyAppId = process.env.TESTING_PRIVY_APP_ID ?? "";
const testingPrivyClientId = process.env.TESTING_PRIVY_CLIENT_ID ?? "";
const publicE2ePrivy = process.env.PUBLIC_E2E_PRIVY ?? "";

export default defineConfig({
  root: ".",
  plugins: [manifestApiPlugin()],
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
});
