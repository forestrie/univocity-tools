import { afterEach, describe, expect, test, vi } from "bun:test";
import { resolveUnivocityReleaseTag } from "../resolve-release-tag.js";

describe("resolveUnivocityReleaseTag", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("resolves latest via GitHub releases API", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe(
        "https://api.github.com/repos/forestrie/univocity/releases/latest",
      );
      return new Response(JSON.stringify({ tag_name: "v0.1.5" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await expect(resolveUnivocityReleaseTag("latest")).resolves.toBe("v0.1.5");
  });

  test("normalizes concrete tags without GitHub lookup", async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    await expect(resolveUnivocityReleaseTag("0.1.4")).resolves.toBe("v0.1.4");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
