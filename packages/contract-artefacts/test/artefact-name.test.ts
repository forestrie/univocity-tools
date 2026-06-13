import { describe, expect, test } from "bun:test";
import {
  deriveArtefactBaseName,
  isIgnoredArtefact,
  selectArtefacts,
} from "../artefact-name.js";

describe("deriveArtefactBaseName", () => {
  test("handles release-id suffix", () => {
    expect(deriveArtefactBaseName("univocity-v0.1.3+260612-abc.tar.gz")).toBe(
      "univocity",
    );
  });

  test("handles tag suffix", () => {
    expect(deriveArtefactBaseName("univocity-v0.1.2.tar.gz")).toBe(
      "univocity",
    );
  });

  test("handles bare base name", () => {
    expect(deriveArtefactBaseName("univocity.tar.gz")).toBe("univocity");
  });

  test("handles create3-factory with tag suffix", () => {
    expect(deriveArtefactBaseName("create3-factory-v0.1.2.tar.gz")).toBe(
      "create3-factory",
    );
  });
});

describe("isIgnoredArtefact", () => {
  test("ignores source code archives", () => {
    expect(isIgnoredArtefact("Source code (zip)")).toBe(true);
  });

  test("ignores non-tarballs", () => {
    expect(isIgnoredArtefact("univocity-v0.1.2.tar.gz.sha256")).toBe(true);
  });

  test("accepts contract tarballs", () => {
    expect(isIgnoredArtefact("univocity.tar.gz")).toBe(false);
  });
});

describe("selectArtefacts", () => {
  const names = [
    "univocity-v0.1.2.tar.gz",
    "create3-factory-v0.1.2.tar.gz",
    "Source code (zip)",
    "univocity-v0.1.2.tar.gz.sha256",
  ];

  test("returns all non-ignored when selector empty", () => {
    expect(selectArtefacts(names, undefined)).toEqual([
      "univocity-v0.1.2.tar.gz",
      "create3-factory-v0.1.2.tar.gz",
    ]);
  });

  test("matches by base name", () => {
    expect(selectArtefacts(names, "univocity")).toEqual([
      "univocity-v0.1.2.tar.gz",
    ]);
  });

  test("matches by full name", () => {
    expect(selectArtefacts(names, "create3-factory-v0.1.2.tar.gz")).toEqual([
      "create3-factory-v0.1.2.tar.gz",
    ]);
  });

  test("throws when selector does not match", () => {
    expect(() => selectArtefacts(names, "missing")).toThrow(
      /artefact "missing" not found/,
    );
  });
});
