import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { parseContractReleasesCatalog } from "../list-releases.js";
import { resolveContractReleaseBySemverAndChannel } from "../resolve-contract-release.js";

describe("resolveContractReleaseBySemverAndChannel", () => {
  test("selects the newest release for semver range and channel", () => {
    const catalogPath = path.join(
      import.meta.dirname,
      "../fixtures/contract-releases.json",
    );
    const releases = parseContractReleasesCatalog(
      readFileSync(catalogPath, "utf8"),
    );

    expect(
      resolveContractReleaseBySemverAndChannel(releases, {
        semverRange: "^0.4.0",
        channel: "dev",
      }),
    ).toEqual({
      version: "v0.4.0",
      channel: "dev",
      es256Address: "0x1111111111111111111111111111111111111111",
      ks256Address: "0x2222222222222222222222222222222222222222",
    });

    expect(
      resolveContractReleaseBySemverAndChannel(releases, {
        semverRange: "^0.4.0",
        channel: "prod",
      }),
    ).toEqual({
      version: "v0.4.0",
      channel: "prod",
      ks256Address: "0x4444444444444444444444444444444444444444",
    });

    expect(
      resolveContractReleaseBySemverAndChannel(releases, {
        semverRange: "^0.3.0",
        channel: "stg",
      }),
    ).toEqual({
      version: "v0.3.0",
      channel: "stg",
      es256Address: "0x3333333333333333333333333333333333333333",
    });
  });
});
