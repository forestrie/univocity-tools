import { describe, expect, test } from "bun:test";
import { formatProcessFailure } from "../run-process.js";

describe("formatProcessFailure", () => {
  test("prefers stderr in the detail", () => {
    const message = formatProcessFailure("tar -xzf foo.tgz", {
      stdout: "stdout noise",
      stderr: "permission denied",
      exitCode: 2,
    });
    expect(message).toBe("tar -xzf foo.tgz failed (2): permission denied");
  });

  test("falls back to stdout when stderr is empty", () => {
    const message = formatProcessFailure("rsync -a src/ dest/", {
      stdout: "rsync error",
      stderr: "   ",
      exitCode: 1,
    });
    expect(message).toBe("rsync -a src/ dest/ failed (1): rsync error");
  });

  test("uses generic failed when both streams are empty", () => {
    const message = formatProcessFailure("forge build", {
      stdout: "",
      stderr: "",
      exitCode: 127,
    });
    expect(message).toBe("forge build failed (127): failed");
  });
});
