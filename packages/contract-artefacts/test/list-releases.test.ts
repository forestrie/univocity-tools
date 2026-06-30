import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { listContractReleases } from "../list-releases.js";

describe("listContractReleases", () => {
  test("loads releases from an explicit catalog path", async () => {
    const catalogPath = path.join(
      import.meta.dirname,
      "../../deploy-core/fixtures/contract-releases.json",
    );
    const expected = JSON.parse(readFileSync(catalogPath, "utf8"));

    const releases = await listContractReleases({ catalogPath });

    expect(releases).toEqual(expected);
  });
});
