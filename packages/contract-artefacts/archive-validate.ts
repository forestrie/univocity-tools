import type { Out } from "@univocity-tools/cli-kit/reporting";
import { runChecked } from "@univocity-tools/subprocess/run-checked";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { ArchiveValidateOptions } from "./options.js";
import { SOLIDITY_FILES_CACHE } from "./archive.js";

type BuildInfoSource = {
  content?: string;
};

type BuildInfoJson = {
  input?: {
    sources?: Record<string, BuildInfoSource>;
  };
};

/**
 * Validate a release root produced by archive-extract against the forge build
 * tree in the contracts checkout.
 */
export async function runArchiveValidate(
  out: Out,
  options: ArchiveValidateOptions,
): Promise<void> {
  const releaseOut = path.join(options.releaseRoot, "out");
  const releaseCache = path.join(
    options.releaseRoot,
    "cache",
    SOLIDITY_FILES_CACHE,
  );
  const referenceCache = path.join(options.cacheDir, SOLIDITY_FILES_CACHE);

  if (!existsSync(releaseOut)) {
    throw new Error(`release out/ not found at ${releaseOut}`);
  }
  if (!existsSync(options.outDir)) {
    throw new Error(
      `reference out dir not found at ${options.outDir}; run forge build first`,
    );
  }
  if (!existsSync(releaseCache)) {
    throw new Error(`release cache file not found at ${releaseCache}`);
  }
  if (!existsSync(referenceCache)) {
    throw new Error(
      `${SOLIDITY_FILES_CACHE} not found at ${referenceCache}; run forge build first`,
    );
  }

  out.print(
    "validating release root %s against forge out %s",
    options.releaseRoot,
    options.outDir,
  );

  await runChecked(out, ["diff", "-rq", releaseOut, options.outDir]);

  const releaseCacheBytes = readFileSync(releaseCache);
  const referenceCacheBytes = readFileSync(referenceCache);
  if (!releaseCacheBytes.equals(referenceCacheBytes)) {
    throw new Error(
      `${SOLIDITY_FILES_CACHE} mismatch between release root and forge cache`,
    );
  }

  const buildInfoDir = path.join(releaseOut, "build-info");
  if (existsSync(buildInfoDir)) {
    await validateHydratedSources(
      out,
      options.releaseRoot,
      options.univocityRoot,
      buildInfoDir,
    );
  }

  out.out("%s", options.releaseRoot);
}

async function validateHydratedSources(
  out: Out,
  releaseRoot: string,
  checkoutRoot: string,
  buildInfoDir: string,
): Promise<void> {
  out.print("verifying hydrated sources against contracts checkout");

  for (const entry of readdirSync(buildInfoDir)) {
    if (!entry.endsWith(".json")) {
      continue;
    }
    const infoPath = path.join(buildInfoDir, entry);
    let info: BuildInfoJson;
    try {
      info = JSON.parse(readFileSync(infoPath, "utf8")) as BuildInfoJson;
    } catch (exc) {
      const message = exc instanceof Error ? exc.message : String(exc);
      throw new Error(`failed to read build-info ${infoPath}: ${message}`);
    }

    const sources = info.input?.sources ?? {};
    for (const [sourcePath, source] of Object.entries(sources)) {
      if (source.content === undefined) {
        continue;
      }

      const extracted = path.join(releaseRoot, sourcePath);
      const original = path.join(checkoutRoot, sourcePath);

      if (!existsSync(extracted)) {
        throw new Error(
          `hydrated source missing after extract: ${sourcePath}`,
        );
      }
      if (!existsSync(original)) {
        throw new Error(
          `checkout source missing for build-info path: ${sourcePath}`,
        );
      }

      const extractedBytes = readFileSync(extracted);
      const originalBytes = readFileSync(original);
      if (!extractedBytes.equals(originalBytes)) {
        throw new Error(
          `hydrated source differs from checkout: ${sourcePath}`,
        );
      }
    }
  }
}
