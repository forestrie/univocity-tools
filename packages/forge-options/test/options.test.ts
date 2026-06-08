import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FORGE_CONFIG,
  DEFAULT_FORGE_OUT,
  parseForgeOptions,
  resolveForgeConfigPath,
  resolveForgeOutDir,
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

describe("resolveForgeOutDir", () => {
  test("default out under forge config directory", () => {
    expect(resolveForgeOutDir(undefined, `${ROOT}/foundry.toml`)).toBe(
      `${ROOT}/${DEFAULT_FORGE_OUT}`,
    );
  });

  test("relative path under forge config directory", () => {
    expect(
      resolveForgeOutDir(
        "custom-out",
        `${ROOT}/script/create3-factory/foundry.toml`,
      ),
    ).toBe(`${ROOT}/script/create3-factory/custom-out`);
  });

  test("absolute path unchanged", () => {
    expect(resolveForgeOutDir("/var/forge-out", `${ROOT}/foundry.toml`)).toBe(
      "/var/forge-out",
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
      outDir: `${ROOT}/script/create3-factory/out`,
    });
  });

  test("reads camelCase forgeConfig", () => {
    expect(parseForgeOptions({ forgeConfig: "foundry.toml" }, ROOT)).toEqual({
      forgeConfig: `${ROOT}/foundry.toml`,
      outDir: `${ROOT}/out`,
    });
  });

  test("default outDir", () => {
    expect(parseForgeOptions({}, ROOT)).toEqual({
      forgeConfig: `${ROOT}/foundry.toml`,
      outDir: `${ROOT}/out`,
    });
  });

  test("reads foundry-out kebab flag", () => {
    expect(
      parseForgeOptions(
        {
          "forge-config": "script/create3-factory/foundry.toml",
          "foundry-out": "custom-out",
        },
        ROOT,
      ),
    ).toEqual({
      forgeConfig: `${ROOT}/script/create3-factory/foundry.toml`,
      outDir: `${ROOT}/script/create3-factory/custom-out`,
    });
  });

  test("reads camelCase foundryOut", () => {
    expect(parseForgeOptions({ foundryOut: "build-out" }, ROOT)).toEqual({
      forgeConfig: `${ROOT}/foundry.toml`,
      outDir: `${ROOT}/build-out`,
    });
  });
});
