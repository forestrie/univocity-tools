import { Buffer } from "buffer";

/** Privy / viem dependencies expect Node's Buffer in some browser code paths. */
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
