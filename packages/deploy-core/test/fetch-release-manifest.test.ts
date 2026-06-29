import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "bun:test";
import { fetchUnivocityReleaseManifest } from "../fetch-release-manifest.js";

const FIXTURE = readFileSync(
  path.join(import.meta.dirname, "fixtures/deploy-manifest.fixture.json"),
  "utf8",
);

describe("fetchUnivocityReleaseManifest", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("resolves latest to a concrete tag before downloading manifest assets", async () => {
    const releaseTag = "v0.1.5";
    const manifestName = `deploy-manifest-${releaseTag}.json`;
    const sidecar = "abc" + "d".repeat(61) + `  ${manifestName}\n`;
    const releasesBase = "https://releases.test/download";

    globalThis.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/repos/forestrie/univocity/releases/latest")) {
          return new Response(JSON.stringify({ tag_name: releaseTag }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (
          url ===
          `${releasesBase}/${releaseTag}/deploy-manifest-${releaseTag}.json`
        ) {
          expect(init?.redirect).toBe("follow");
          return new Response(FIXTURE, { status: 200 });
        }
        if (
          url ===
          `${releasesBase}/${releaseTag}/deploy-manifest-${releaseTag}.json.sha256`
        ) {
          return new Response(sidecar, { status: 200 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
    ) as unknown as typeof fetch;

    const result = await fetchUnivocityReleaseManifest("latest", {
      releasesBase,
    });

    expect(result.releaseTag).toBe("v0.1.5");
    expect(result.raw).toBe(FIXTURE);
    expect(result.sidecar).toBe(sidecar);
  });

  test("resolves manifest assets for v0.1.4 via release download URLs", async () => {
    const releaseTag = "v0.1.4";
    const manifestName = `deploy-manifest-${releaseTag}.json`;
    const sidecar = "abc" + "d".repeat(61) + `  ${manifestName}\n`;
    const releasesBase = "https://releases.test/download";

    globalThis.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url ===
          `${releasesBase}/${releaseTag}/deploy-manifest-${releaseTag}.json`
        ) {
          expect(init?.redirect).toBe("follow");
          return new Response(FIXTURE, { status: 200 });
        }
        if (
          url ===
          `${releasesBase}/${releaseTag}/deploy-manifest-${releaseTag}.json.sha256`
        ) {
          return new Response(sidecar, { status: 200 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
    ) as unknown as typeof fetch;

    const result = await fetchUnivocityReleaseManifest("0.1.4", {
      releasesBase,
    });

    expect(result.releaseTag).toBe("v0.1.4");
    expect(result.raw).toBe(FIXTURE);
    expect(result.sidecar).toBe(sidecar);
  });

  test("reports missing manifest asset", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    await expect(fetchUnivocityReleaseManifest("v0.1.5")).rejects.toThrow(
      "manifest download failed (404)",
    );
  });
});
