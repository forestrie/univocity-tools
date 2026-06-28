import { afterEach, describe, expect, test, vi } from "vitest";
import {
  ensurePrivyEmbeddedWalletBridge,
  resetPrivyIframeBridgeForTests,
} from "../src/lib/privy-iframe.js";

describe("ensurePrivyEmbeddedWalletBridge", () => {
  afterEach(() => {
    resetPrivyIframeBridgeForTests();
  });

  test("mounts iframe and registers message poster", async () => {
    const onMessage = vi.fn();
    const getURL = vi.fn(() => "https://privy.example/embedded-wallet");
    const setMessagePoster = vi.fn();

    const privy = {
      embeddedWallet: {
        getURL,
        onMessage,
      },
      setMessagePoster,
    };

    await ensurePrivyEmbeddedWalletBridge(privy as never);

    const iframe = document.getElementById("privy-embedded-wallet-iframe");
    expect(iframe).toBeTruthy();
    expect(iframe?.tagName).toBe("IFRAME");
    expect((iframe as HTMLIFrameElement).src).toBe(
      "https://privy.example/embedded-wallet",
    );
    expect(setMessagePoster).toHaveBeenCalledOnce();
    expect(setMessagePoster.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        postMessage: expect.any(Function),
        reload: expect.any(Function),
      }),
    );

    await ensurePrivyEmbeddedWalletBridge(privy as never);
    expect(getURL).toHaveBeenCalledOnce();
  });

  test("forwards iframe postMessage to embeddedWallet.onMessage", async () => {
    const onMessage = vi.fn();
    const privy = {
      embeddedWallet: {
        getURL: () => "about:blank",
        onMessage,
      },
      setMessagePoster: vi.fn(),
    };

    const addSpy = vi.spyOn(window, "addEventListener");
    await ensurePrivyEmbeddedWalletBridge(privy as never);
    const iframe = document.getElementById(
      "privy-embedded-wallet-iframe",
    ) as HTMLIFrameElement;

    const messageHandler = addSpy.mock.calls.find(
      (call) => call[0] === "message",
    )?.[1] as ((event: MessageEvent) => void) | undefined;
    expect(messageHandler).toBeTypeOf("function");

    const payload = { event: "test-event" };
    messageHandler!({
      source: iframe.contentWindow,
      data: JSON.stringify(payload),
    } as MessageEvent);

    expect(onMessage).toHaveBeenCalledWith(payload);
    addSpy.mockRestore();
  });
});
