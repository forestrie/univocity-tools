import { Window } from "happy-dom";

/**
 * Privy js-sdk-core needs `window` + localStorage but real `fetch` (Node/Bun)
 * so auth headers are sent correctly. happy-dom's fetch breaks privy-app-id.
 */
const window = new Window({
  url: "http://localhost:5175/",
});

const globalRecord = globalThis as typeof globalThis & {
  window: Window;
  document: Document;
  localStorage: Storage;
  sessionStorage: Storage;
  navigator: Navigator;
};

globalRecord.window = window as never;
globalRecord.document = window.document as unknown as Document;
globalRecord.localStorage = window.localStorage;
globalRecord.sessionStorage = window.sessionStorage;

Object.defineProperty(globalThis, "location", {
  configurable: true,
  value: window.location,
});

/** Node fetch omits Origin; Privy passwordless endpoints require it (missing_origin). */
const deployWebOrigin = "http://localhost:5175";
const nativeFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Origin")) {
    headers.set("Origin", deployWebOrigin);
  }
  return nativeFetch(input, { ...init, headers });
};
