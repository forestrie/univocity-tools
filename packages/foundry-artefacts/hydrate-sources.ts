import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type HydrateSourcesResult = {
  written: number;
  warnings: string[];
};

type BuildInfoSource = {
  content?: string;
};

type BuildInfoJson = {
  input?: {
    sources?: Record<string, BuildInfoSource>;
  };
};

/**
 * Materialize Solidity sources from forge `out/build-info` embedded content
 * into `releaseRoot`. Skips paths that already exist.
 */
export async function hydrateSources(
  releaseRoot: string,
): Promise<HydrateSourcesResult> {
  const buildInfoDir = path.join(releaseRoot, "out", "build-info");
  if (!existsSync(buildInfoDir)) {
    return { written: 0, warnings: [] };
  }

  const warnings: string[] = [];
  let written = 0;

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
      warnings.push(`failed to read build-info ${infoPath}: ${message}`);
      continue;
    }

    const sources = info.input?.sources ?? {};
    for (const [sourcePath, source] of Object.entries(sources)) {
      const content = source.content;
      if (content === undefined) {
        continue;
      }
      const dest = path.join(releaseRoot, sourcePath);
      if (existsSync(dest)) {
        continue;
      }
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, content, "utf8");
      written += 1;
    }
  }

  return { written, warnings };
}
