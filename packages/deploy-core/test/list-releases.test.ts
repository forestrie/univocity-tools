import path from "node:path";
import { describe, expect, test } from "bun:test";
import { listContractReleases } from "../list-releases.js";

describe("listContractReleases", () => {
  test("returns versioned releases with optional es256 and ks256 addresses", async () => {
    const catalogPath = path.join(
      import.meta.dirname,
      "../fixtures/contract-releases.json",
    );

    const releases = await listContractReleases({ catalogPath });

    expect(releases).toEqual([
      {
        version: "v0.4.0",
        es256Address: "0x1111111111111111111111111111111111111111",
        ks256Address: "0x2222222222222222222222222222222222222222",
      },
      {
        version: "v0.3.0",
        es256Address: "0x3333333333333333333333333333333333333333",
      },
    ]);
  });
});
