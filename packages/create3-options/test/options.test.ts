import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CREATE3_DEFAULTS } from "../src/defaults.js";
import { resolveCreate3Config } from "../options.js";

const SAMPLE_CONFIG = {
  proxy: "0x1111111111111111111111111111111111111111",
  "deploy-tx": "0xabcd",
  signer: "0x2222222222222222222222222222222222222222",
  factory: "0x3333333333333333333333333333333333333333",
} as const;

describe("resolveCreate3Config", () => {
  let tempDir: string;
  let originalCreate3Config: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "create3-options-"));
    originalCreate3Config = process.env.CREATE3_CONFIG;
    delete process.env.CREATE3_CONFIG;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    if (originalCreate3Config === undefined) {
      delete process.env.CREATE3_CONFIG;
    } else {
      process.env.CREATE3_CONFIG = originalCreate3Config;
    }
  });

  test("returns embedded defaults when no override or discovery", () => {
    expect(resolveCreate3Config({}, tempDir)).toEqual(CREATE3_DEFAULTS);
  });

  test("--create3-config overrides embedded defaults", () => {
    const configPath = path.join(tempDir, "override.jsonc");
    writeFileSync(configPath, JSON.stringify(SAMPLE_CONFIG));

    expect(
      resolveCreate3Config({ "create3-config": configPath }, tempDir),
    ).toEqual(SAMPLE_CONFIG);
  });

  test("CREATE3_CONFIG env overrides embedded defaults", () => {
    const configPath = path.join(tempDir, "env.jsonc");
    writeFileSync(configPath, JSON.stringify(SAMPLE_CONFIG));
    process.env.CREATE3_CONFIG = configPath;

    expect(resolveCreate3Config({}, tempDir)).toEqual(SAMPLE_CONFIG);
  });

  test("CLI flag wins over CREATE3_CONFIG env", () => {
    const envPath = path.join(tempDir, "env.jsonc");
    const flagPath = path.join(tempDir, "flag.jsonc");
    writeFileSync(envPath, JSON.stringify(SAMPLE_CONFIG));
    writeFileSync(
      flagPath,
      JSON.stringify({
        ...SAMPLE_CONFIG,
        factory: "0x4444444444444444444444444444444444444444",
      }),
    );
    process.env.CREATE3_CONFIG = envPath;

    expect(
      resolveCreate3Config({ "create3-config": flagPath }, tempDir),
    ).toEqual({
      ...SAMPLE_CONFIG,
      factory: "0x4444444444444444444444444444444444444444",
    });
  });

  test("discovers create3.jsonc in a univocity-tools checkout", () => {
    const toolsRoot = path.join(tempDir, "univocity-tools");
    mkdirSync(path.join(toolsRoot, "apps", "deployer"), { recursive: true });
    writeFileSync(path.join(toolsRoot, ".git"), "fixture\n");
    writeFileSync(
      path.join(toolsRoot, "create3.jsonc"),
      JSON.stringify(SAMPLE_CONFIG),
    );

    expect(
      resolveCreate3Config({}, path.join(toolsRoot, "apps/deployer")),
    ).toEqual(SAMPLE_CONFIG);
  });

  test("throws on invalid config file", () => {
    const configPath = path.join(tempDir, "bad.jsonc");
    writeFileSync(
      configPath,
      JSON.stringify({
        proxy: "not-an-address",
        "deploy-tx": "0xabcd",
        signer: "0x2222222222222222222222222222222222222222",
        factory: "0x3333333333333333333333333333333333333333",
      }),
    );

    expect(() =>
      resolveCreate3Config({ "create3-config": configPath }, tempDir),
    ).toThrow("proxy must be a 0x-prefixed address");
  });
});
