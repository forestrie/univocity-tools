import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  createGithubClient,
  downloadArtifactZip,
  getLatestRun,
  getRunById,
  listRunArtifacts,
  resolveGithubToken,
} from "@univocity-tools/github-api/main";
import type { Artifact } from "@univocity-tools/github-api/main";
import { deriveArtefactBaseName, selectArtefacts } from "./artefact-name.js";
import { extractArtifactZip } from "./extract-artifact-zip.js";
import type { FetchRunOptions } from "./options.js";
import { saveArtefact } from "./fetch-save.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function selectRunArtifacts(
  artifacts: Artifact[],
  selector: string | undefined,
): Artifact[] {
  const trimmed = selector?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    if (artifacts.length === 0) {
      throw new Error("no workflow artefacts found for run");
    }
    return artifacts;
  }

  const byName = artifacts.filter((artifact) => artifact.name === trimmed);
  if (byName.length > 0) {
    return byName;
  }

  const base = deriveArtefactBaseName(
    trimmed.endsWith(".tar.gz") ? trimmed : `${trimmed}.tar.gz`,
  );
  const byBase = artifacts.filter((artifact) => artifact.name === base);
  if (byBase.length > 0) {
    return byBase;
  }

  throw new Error(`artefact "${trimmed}" not found on workflow run`);
}

export async function runFetchRun(
  out: Out,
  options: FetchRunOptions,
): Promise<void> {
  const token = await resolveGithubToken(out, options.authKind);
  const client = createGithubClient({
    org: options.org,
    repo: options.repo,
    token,
  });

  const run =
    options.runId !== undefined
      ? await getRunById(client, options.runId)
      : await getLatestRun(client, {
          workflow: options.workflow,
          branch: options.branch,
        });

  out.print(
    "fetching workflow run %s (%s)",
    String(run.id),
    options.runId ?? "latest",
  );

  const artifacts = await listRunArtifacts(client, run.id);
  const selectedArtifacts = selectRunArtifacts(artifacts, options.artefact);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cart-fetch-run-"));
  try {
    for (const artifact of selectedArtifacts) {
      const zipPath = path.join(tempRoot, `${artifact.name}.zip`);
      const extractDir = path.join(tempRoot, artifact.name);
      await downloadArtifactZip(client, artifact.id, zipPath);
      const tarballPaths = await extractArtifactZip(out, zipPath, extractDir);
      const tarballNames = tarballPaths.map((filePath) =>
        path.basename(filePath),
      );
      const selectedTarballs = selectArtefacts(tarballNames, options.artefact);
      const tarballByName = new Map(
        tarballPaths.map((filePath) => [path.basename(filePath), filePath]),
      );
      for (const name of selectedTarballs) {
        const sourcePath = tarballByName.get(name);
        if (sourcePath === undefined) {
          throw new Error(`extracted artefact "${name}" not found`);
        }
        await saveArtefact(out, options.workDir, name, sourcePath);
      }
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
