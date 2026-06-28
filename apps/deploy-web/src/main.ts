import { getPrivyAppId, isE2ePrivyMock } from "./env.js";
import { mountApp } from "./app.js";
import { getPrivyClient } from "./lib/privy.js";
import { ensurePrivyEmbeddedWalletBridge } from "./lib/privy-iframe.js";

const root = document.getElementById("app");
if (root) {
  mountApp(root);
}

if (!isE2ePrivyMock() && getPrivyAppId()) {
  void getPrivyClient().then(ensurePrivyEmbeddedWalletBridge);
}
