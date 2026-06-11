import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { hydrateSources } from "../hydrate-sources.js";

function writeFile(file: string, contents: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}

describe("hydrateSources", () => {
  test("no-op when out/build-info is absent", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hydrate-"));
    try {
      const result = await hydrateSources(root);
      expect(result).toEqual({ written: 0, warnings: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("writes sources from build-info embedded content", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hydrate-"));
    try {
      writeFile(
        path.join(root, "out", "build-info", "abc123.json"),
        JSON.stringify({
          input: {
            sources: {
              "src/Foo.sol": { content: "pragma solidity ^0.8.0;" },
              "src/Bar.sol": { content: "pragma solidity ^0.8.0;\n" },
            },
          },
        }),
      );

      const result = await hydrateSources(root);
      expect(result.written).toBe(2);
      expect(result.warnings).toEqual([]);
      expect(readFileSync(path.join(root, "src", "Foo.sol"), "utf8")).toBe(
        "pragma solidity ^0.8.0;",
      );
      expect(readFileSync(path.join(root, "src", "Bar.sol"), "utf8")).toBe(
        "pragma solidity ^0.8.0;\n",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("skips existing destination files", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hydrate-"));
    try {
      writeFile(path.join(root, "src", "Foo.sol"), "existing");
      writeFile(
        path.join(root, "out", "build-info", "abc123.json"),
        JSON.stringify({
          input: {
            sources: {
              "src/Foo.sol": { content: "new content" },
              "src/Bar.sol": { content: "new bar" },
            },
          },
        }),
      );

      const result = await hydrateSources(root);
      expect(result.written).toBe(1);
      expect(readFileSync(path.join(root, "src", "Foo.sol"), "utf8")).toBe(
        "existing",
      );
      expect(existsSync(path.join(root, "src", "Bar.sol"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("warns on malformed build-info JSON", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hydrate-"));
    try {
      writeFile(path.join(root, "out", "build-info", "bad.json"), "{not json");
      writeFile(
        path.join(root, "out", "build-info", "good.json"),
        JSON.stringify({
          input: {
            sources: {
              "src/Good.sol": { content: "pragma solidity ^0.8.0;" },
            },
          },
        }),
      );

      const result = await hydrateSources(root);
      expect(result.written).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("bad.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ignores sources without embedded content", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hydrate-"));
    try {
      writeFile(
        path.join(root, "out", "build-info", "abc123.json"),
        JSON.stringify({
          input: {
            sources: {
              "src/NoContent.sol": { keccak256: "0xabc" },
            },
          },
        }),
      );

      const result = await hydrateSources(root);
      expect(result.written).toBe(0);
      expect(existsSync(path.join(root, "src", "NoContent.sol"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
