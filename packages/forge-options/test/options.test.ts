import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FORGE_CONFIG,
  DEFAULT_FORGE_OUT,
  parseForgeOptions,
  resolveBuildRoot,
  resolveBuildRootDir,
  resolveForgeConfigPath,
  type ForgeOptions,
} from "../options.js";

const ROOT = "/tmp/univocity";

/** Expected ForgeOptions for a given config dir (build root). */
function expectedForge(configRel: string): ForgeOptions {
  const forgeConfig = `${ROOT}/${configRel}`;
  const buildRoot = forgeConfig.slice(0, forgeConfig.lastIndexOf("/"));
  return {
    forgeConfig,
    buildRoot,
    outDir: `${buildRoot}/out`,
    srcDir: `${buildRoot}/src`,
    cacheDir: `${buildRoot}/cache`,
    libsDir: `${buildRoot}/lib`,
  };
}

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

describe("resolveBuildRoot", () => {
  test("defaults to the forge config directory", () => {
    expect(resolveBuildRoot(undefined, `${ROOT}/foundry.toml`)).toBe(ROOT);
  });

  test("relative build root under the forge config directory", () => {
    expect(resolveBuildRoot("nested", `${ROOT}/script/foundry.toml`)).toBe(
      `${ROOT}/script/nested`,
    );
  });

  test("absolute build root unchanged", () => {
    expect(resolveBuildRoot("/var/build", `${ROOT}/foundry.toml`)).toBe(
      "/var/build",
    );
  });
});

describe("resolveBuildRootDir", () => {
  test("default fallback under the build root", () => {
    expect(resolveBuildRootDir(undefined, ROOT, DEFAULT_FORGE_OUT)).toBe(
      `${ROOT}/${DEFAULT_FORGE_OUT}`,
    );
  });

  test("relative dir under the build root", () => {
    expect(resolveBuildRootDir("custom-out", ROOT, DEFAULT_FORGE_OUT)).toBe(
      `${ROOT}/custom-out`,
    );
  });

  test("absolute dir unchanged", () => {
    expect(
      resolveBuildRootDir("/var/forge-out", ROOT, DEFAULT_FORGE_OUT),
    ).toBe("/var/forge-out");
  });
});

describe("parseForgeOptions", () => {
  test("reads forge-config kebab flag", () => {
    expect(
      parseForgeOptions(
        { "forge-config": "script/create3-factory/foundry.toml" },
        ROOT,
      ),
    ).toEqual(expectedForge("script/create3-factory/foundry.toml"));
  });

  test("reads camelCase forgeConfig", () => {
    expect(parseForgeOptions({ forgeConfig: "foundry.toml" }, ROOT)).toEqual(
      expectedForge("foundry.toml"),
    );
  });

  test("default outDir", () => {
    expect(parseForgeOptions({}, ROOT)).toEqual(expectedForge("foundry.toml"));
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
      ...expectedForge("script/create3-factory/foundry.toml"),
      outDir: `${ROOT}/script/create3-factory/custom-out`,
    });
  });

  test("reads camelCase foundryOut", () => {
    expect(parseForgeOptions({ foundryOut: "build-out" }, ROOT)).toEqual({
      ...expectedForge("foundry.toml"),
      outDir: `${ROOT}/build-out`,
    });
  });

  test("reads foundry-src/cache/libs and build-root flags", () => {
    expect(
      parseForgeOptions(
        {
          "build-root": "artifacts",
          "foundry-src": "contracts",
          "foundry-cache": "fcache",
          "foundry-libs": "vendor",
        },
        ROOT,
      ),
    ).toEqual({
      forgeConfig: `${ROOT}/foundry.toml`,
      buildRoot: `${ROOT}/artifacts`,
      outDir: `${ROOT}/artifacts/out`,
      srcDir: `${ROOT}/artifacts/contracts`,
      cacheDir: `${ROOT}/artifacts/fcache`,
      libsDir: `${ROOT}/artifacts/vendor`,
    });
  });

  test("resolves ${env:VAR} before path join", () => {
    const prev = process.env.MY_FORGE_CONFIG;
    process.env.MY_FORGE_CONFIG = "script/create3-factory/foundry.toml";
    try {
      expect(
        parseForgeOptions({ "forge-config": "${env:MY_FORGE_CONFIG}" }, ROOT),
      ).toEqual(expectedForge("script/create3-factory/foundry.toml"));
    } finally {
      if (prev === undefined) {
        delete process.env.MY_FORGE_CONFIG;
      } else {
        process.env.MY_FORGE_CONFIG = prev;
      }
    }
  });

  test("resolves ${env} from option-derived variable name", () => {
    const prev = process.env.FORGE_CONFIG;
    process.env.FORGE_CONFIG = "custom/foundry.toml";
    try {
      expect(parseForgeOptions({ "forge-config": "${env}" }, ROOT)).toEqual(
        expectedForge("custom/foundry.toml"),
      );
    } finally {
      if (prev === undefined) {
        delete process.env.FORGE_CONFIG;
      } else {
        process.env.FORGE_CONFIG = prev;
      }
    }
  });
});
