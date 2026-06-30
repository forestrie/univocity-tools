import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import { listContractReleases } from "../../list-releases.js";
import { runListReleases } from "../../main.js";
import { parseListReleasesOptions } from "../../options.js";
import { parseContractReleasesCatalog } from "@univocity-tools/deploy-core/list-releases";

const FIXTURE_CATALOG = path.join(
  import.meta.dirname,
  "../../../deploy-core/fixtures/contract-releases.json",
);

const DEPLOYMENT_FIXTURE = path.join(
  import.meta.dirname,
  "../../../deploy-core/fixtures/deployment-with-releases.json",
);

function expectReleaseCatalogShape(value: unknown): void {
  expect(Array.isArray(value)).toBe(true);
  for (const entry of value as unknown[]) {
    expect(entry).toMatchObject({
      version: expect.stringMatching(/^v\d+\.\d+\.\d+$/),
    });
    if (
      entry !== null &&
      typeof entry === "object" &&
      "es256Address" in entry
    ) {
      expect((entry as { es256Address: string }).es256Address).toMatch(
        /^0x[0-9a-fA-F]{40}$/,
      );
    }
    if (
      entry !== null &&
      typeof entry === "object" &&
      "ks256Address" in entry
    ) {
      expect((entry as { ks256Address: string }).ks256Address).toMatch(
        /^0x[0-9a-fA-F]{40}$/,
      );
    }
  }
}

describe("T4 list-releases confidence", () => {
  test("deploy-core catalog parser matches committed fixture", () => {
    const raw = Bun.file(FIXTURE_CATALOG).text();
    return raw.then((catalogRaw) => {
      const parsed = parseContractReleasesCatalog(catalogRaw);
      const expected = JSON.parse(catalogRaw);
      expect(parsed).toEqual(expected);
      expectReleaseCatalogShape(parsed);
    });
  });

  test("listContractReleases agrees with deploy-core fixture catalog", async () => {
    const expected = JSON.parse(await Bun.file(FIXTURE_CATALOG).text());
    const releases = await listContractReleases({
      catalogPath: FIXTURE_CATALOG,
    });
    expect(releases).toEqual(expected);
  });

  test("listContractReleases reads releases from deployment.json", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "univocity-deployment-"));
    writeFileSync(
      path.join(root, "deployment.json"),
      await Bun.file(DEPLOYMENT_FIXTURE).text(),
    );

    const releases = await listContractReleases({ univocityRoot: root });

    expect(releases).toEqual([
      {
        version: "v0.1.4",
        es256Address: "0x7A4E8ad88D6Df29FEBEc0d546d148Ed4bea8Cb94",
      },
    ]);
  });

  test("runListReleases prints JSON matching fixture shape", async () => {
    const emptyRoot = mkdtempSync(path.join(tmpdir(), "univocity-empty-"));
    mkdirSync(emptyRoot, { recursive: true });
    const capture = createCaptureOut(-1);
    await runListReleases(
      capture,
      parseListReleasesOptions({ "source-root": emptyRoot }),
    );

    expect(capture.lines).toHaveLength(1);
    const printed = JSON.parse(capture.lines[0]!.text);
    const expected = JSON.parse(await Bun.file(FIXTURE_CATALOG).text());
    expect(printed).toEqual(expected);
    expectReleaseCatalogShape(printed);
  });
});
