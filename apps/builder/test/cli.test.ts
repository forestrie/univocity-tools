import { describe, expect, test } from "bun:test";
import { run, VERSION } from "../src/index";

describe("builder CLI", () => {
  test("--help exits 0", () => {
    expect(run(["--help"])).toBe(0);
  });

  test("--version prints package version", () => {
    expect(run(["--version"])).toBe(0);
    expect(VERSION).toBe("0.1.0");
  });

  test("unknown flag exits 1", () => {
    expect(run(["--nope"])).toBe(1);
  });
});
