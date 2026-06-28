import type Privy from "@privy-io/js-sdk-core";

const IFRAME_ID = "privy-embedded-wallet-iframe";

let bridgePromise: Promise<void> | null = null;
let messageListener: ((event: MessageEvent) => void) | null = null;
let bridgeIframe: HTMLIFrameElement | null = null;

function parseIframeMessageData(data: unknown): unknown {
  if (typeof data === "string") {
    return JSON.parse(data) as unknown;
  }
  return data;
}

export async function ensurePrivyEmbeddedWalletBridge(
  privy: Privy,
): Promise<void> {
  if (bridgePromise) {
    return bridgePromise;
  }

  bridgePromise = (async () => {
    if (typeof document === "undefined") {
      throw new Error("Privy embedded wallet bridge requires a DOM");
    }

    let iframe = document.getElementById(
      IFRAME_ID,
    ) as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = IFRAME_ID;
      iframe.title = "Privy embedded wallet";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:absolute;width:0;height:0;border:0;visibility:hidden";
      iframe.src = privy.embeddedWallet.getURL();
      document.body.appendChild(iframe);
    }
    bridgeIframe = iframe;

    await new Promise<void>((resolve, reject) => {
      if (iframe!.contentWindow) {
        resolve();
        return;
      }
      iframe!.onload = () => resolve();
      iframe!.onerror = () =>
        reject(new Error("Privy embedded wallet iframe failed to load"));
    });

    privy.setMessagePoster({
      postMessage(message, targetOrigin, transfer) {
        if (transfer !== undefined) {
          iframe!.contentWindow!.postMessage(message, targetOrigin, [
            transfer,
          ]);
        } else {
          iframe!.contentWindow!.postMessage(message, targetOrigin);
        }
      },
      reload() {
        iframe!.src = privy.embeddedWallet.getURL();
      },
    });

    if (!messageListener) {
      messageListener = (event: MessageEvent) => {
        if (event.source !== iframe!.contentWindow) {
          return;
        }
        privy.embeddedWallet.onMessage(
          parseIframeMessageData(event.data) as never,
        );
      };
      window.addEventListener("message", messageListener);
    }
  })();

  return bridgePromise;
}

export function resetPrivyIframeBridgeForTests(): void {
  if (messageListener) {
    window.removeEventListener("message", messageListener);
    messageListener = null;
  }
  bridgeIframe?.remove();
  bridgeIframe = null;
  bridgePromise = null;
}
