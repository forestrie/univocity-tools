import { describe, expect, test } from "bun:test";
import { createNullOut } from "@univocity-tools/cli-kit/reporting";
import { runChecked } from "../run-checked.js";

describe("runChecked", () => {
  test("throws a friendly error when the binary cannot be started", async () => {
    await expect(
      runChecked(createNullOut(), [
        "/nonexistent-binary-xyz-subprocess-test",
        "arg",
      ]),
    ).rejects.toThrow(
      "/nonexistent-binary-xyz-subprocess-test is required but could not be started; install it and retry",
    );
  });
});
