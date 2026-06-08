import { describe, expect, test } from "bun:test";
import {
  evaluateOptionValue,
  optionNameToEnvVar,
  readEvaluatedStringOption,
} from "../src/evaluate-option-value.js";

describe("optionNameToEnvVar", () => {
  test("maps kebab-case to upper snake case", () => {
    expect(optionNameToEnvVar("forge-config")).toBe("FORGE_CONFIG");
    expect(optionNameToEnvVar("create3-config")).toBe("CREATE3_CONFIG");
    expect(optionNameToEnvVar("rpc-url")).toBe("RPC_URL");
  });
});

describe("evaluateOptionValue", () => {
  test("returns undefined for undefined input", () => {
    expect(evaluateOptionValue("forge-config", undefined)).toBeUndefined();
  });

  test("passes through literal values", () => {
    expect(evaluateOptionValue("forge-config", "foundry.toml")).toBe(
      "foundry.toml",
    );
  });

  test("resolves ${env:VAR} from environment", () => {
    expect(
      evaluateOptionValue("forge-config", "${env:MY_CONFIG}", {
        env: { MY_CONFIG: "/a.toml" },
      }),
    ).toBe("/a.toml");
  });

  test("resolves ${env} using option name", () => {
    expect(
      evaluateOptionValue("forge-config", "${env}", {
        env: { FORGE_CONFIG: "/b.toml" },
      }),
    ).toBe("/b.toml");
  });

  test("returns undefined when referenced env var is missing", () => {
    expect(
      evaluateOptionValue("forge-config", "${env:MISSING}", { env: {} }),
    ).toBeUndefined();
  });

  test("returns undefined when referenced env var is empty", () => {
    expect(
      evaluateOptionValue("forge-config", "${env:EMPTY}", {
        env: { EMPTY: "" },
      }),
    ).toBeUndefined();
  });

  test("treats escaped ${env} as literal", () => {
    expect(evaluateOptionValue("forge-config", "\\${env}")).toBe("${env}");
  });

  test("treats escaped ${env:BAZ} as literal", () => {
    expect(evaluateOptionValue("forge-config", "\\${env:BAZ}")).toBe(
      "${env:BAZ}",
    );
  });
});

describe("readEvaluatedStringOption", () => {
  test("reads kebab-case arg and evaluates", () => {
    expect(
      readEvaluatedStringOption({ "forge-config": "${env}" }, "forge-config", {
        env: { FORGE_CONFIG: "/c.toml" },
      }),
    ).toBe("/c.toml");
  });

  test("reads camelCase arg and evaluates", () => {
    expect(
      readEvaluatedStringOption(
        { forgeConfig: "${env:ALT}" },
        "forge-config",
        {
          env: { ALT: "/d.toml" },
        },
      ),
    ).toBe("/d.toml");
  });

  test("returns undefined when arg is absent", () => {
    expect(readEvaluatedStringOption({}, "forge-config")).toBeUndefined();
  });
});
