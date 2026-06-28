import { describe, expect, test } from "bun:test";
import { genesisLogIdFromImutableAddress } from "../genesis-log-id.js";

describe("genesisLogIdFromImutableAddress", () => {
  test("derives mnemonic UUID from checksummed address", () => {
    expect(
      genesisLogIdFromImutableAddress(
        "0x1528b86fF561f617602356efdbD05908a07AA788",
      ),
    ).toBe("1528b86f-f561-f617-6023-56efdbd05908");
  });

  test("rejects non-address input", () => {
    expect(() => genesisLogIdFromImutableAddress("not-an-address")).toThrow(
      /expected 20-byte address/,
    );
  });
});
