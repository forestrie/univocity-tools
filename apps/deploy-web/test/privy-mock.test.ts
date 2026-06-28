import { describe, expect, test } from "vitest";
import { isE2ePrivyMock, isE2ePrivyMockFlag } from "../src/env.js";

describe("isE2ePrivyMockFlag", () => {
  test("true only when value is mock", () => {
    expect(isE2ePrivyMockFlag("mock")).toBe(true);
    expect(isE2ePrivyMockFlag("")).toBe(false);
    expect(isE2ePrivyMockFlag(undefined)).toBe(false);
    expect(isE2ePrivyMockFlag("real")).toBe(false);
  });
});

describe("isE2ePrivyMock", () => {
  test("matches import.meta.env.PUBLIC_E2E_PRIVY at build time", () => {
    const expected = import.meta.env.PUBLIC_E2E_PRIVY === "mock";
    expect(isE2ePrivyMock()).toBe(expected);
  });
});
