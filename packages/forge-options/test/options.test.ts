import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FORGE_CONFIG,
  parseForgeOptions,
  resolveForgeConfigPath,
} from "../options.js";

const ROOT = "/tmp/univocity";

describe("resolveForgeConfigPath", () => {
  test("default foundry.toml under root", () => {
    expect(resolveForgeConfigPath(undefined, ROOT)).toBe(
      `${ROOT}/${DEFAULT_FORGE_CONFIG}`,
    );
  });

  test("relative path under root", () => {
    expect(
      resolveForgeConfigPath("script/create3-factory/foundry.toml", ROOT),
    ).toBe(`${ROOT}/script/create3-factory/foundry.toml`);
  });

  test("absolute path unchanged", () => {
    expect(resolveForgeConfigPath("/etc/foundry.toml", ROOT)).toBe(
      "/etc/foundry.toml",
    );
  });
});

describe("parseForgeOptions", () => {
  test("reads forge-config kebab flag", () => {
    expect(
      parseForgeOptions(
        { "forge-config": "script/create3-factory/foundry.toml" },
        ROOT,
      ),
    ).toEqual({
      forgeConfig: `${ROOT}/script/create3-factory/foundry.toml`,
    });
  });

  test("reads camelCase forgeConfig", () => {
    expect(parseForgeOptions({ forgeConfig: "foundry.toml" }, ROOT)).toEqual({
      forgeConfig: `${ROOT}/foundry.toml`,
    });
  });
});
