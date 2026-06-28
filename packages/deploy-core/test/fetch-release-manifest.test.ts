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

  test("resolves manifest assets for v0.1.4 via GitHub API", async () => {
    const releaseTag = "v0.1.4";
    const manifestName = `deploy-manifest-${releaseTag}.json`;
    const sidecar = "abc" + "d".repeat(61) + `  ${manifestName}\n`;

    globalThis.fetch = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/releases/tags/v0.1.4")) {
          return new Response(
            JSON.stringify({
              tag_name: releaseTag,
              assets: [
                {
                  name: manifestName,
                  url: "https://api.github.test/manifest",
                },
                {
                  name: `${manifestName}.sha256`,
                  url: "https://api.github.test/sidecar",
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url === "https://api.github.test/manifest") {
          return new Response(FIXTURE, { status: 200 });
        }
        if (url === "https://api.github.test/sidecar") {
          return new Response(sidecar, { status: 200 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      },
    ) as unknown as typeof fetch;

    const result = await fetchUnivocityReleaseManifest("0.1.4", {
      githubApi: "https://api.github.test",
      org: "forestrie",
      repo: "univocity",
    });

    expect(result.releaseTag).toBe("v0.1.4");
    expect(result.raw).toBe(FIXTURE);
    expect(result.sidecar).toBe(sidecar);
  });

  test("reports missing manifest asset", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          tag_name: "v0.1.5",
          assets: [],
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    await expect(fetchUnivocityReleaseManifest("v0.1.5")).rejects.toThrow(
      "missing asset deploy-manifest-v0.1.5.json",
    );
  });

  test("reports missing release", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    await expect(fetchUnivocityReleaseManifest("v9.9.9")).rejects.toThrow(
      "GitHub release v9.9.9 not found (404)",
    );
  });
});
