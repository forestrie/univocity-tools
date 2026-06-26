import { describe, expect, test } from "bun:test";

const e2eEnabled = process.env.DEPLOYER_E2E === "1";

describe.skipIf(!e2eEnabled)("from-release anvil e2e", () => {
  test("placeholder for opt-in anvil integration", () => {
    expect(process.env.DEPLOYER_E2E).toBe("1");
  });
});
