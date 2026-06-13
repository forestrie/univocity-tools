import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  createGithubClient,
  getLatestRelease,
  getReleaseByTag,
  resolveGithubToken,
} from "@univocity-tools/github-api/main";
import type { ReleaseAsset } from "@univocity-tools/github-api/main";
import { selectArtefacts } from "./artefact-name.js";
import type { FetchReleaseOptions } from "./options.js";
import { saveArtefact } from "./fetch-save.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export async function runFetchRelease(
  out: Out,
  options: FetchReleaseOptions,
): Promise<void> {
  const token = await resolveGithubToken(out, options.authKind);
  const client = createGithubClient({
    org: options.org,
    repo: options.repo,
    token,
  });

  const release =
    options.releaseTag !== undefined
      ? await getReleaseByTag(client, options.releaseTag)
      : await getLatestRelease(client);

  out.print(
    "fetching release %s (%s)",
    release.tag_name,
    options.releaseTag ?? "latest",
  );

  const assetNames = release.assets.map((asset) => asset.name);
  const selectedNames = selectArtefacts(assetNames, options.artefact);
  const assetsByName = new Map<string, ReleaseAsset>(
    release.assets.map((asset) => [asset.name, asset]),
  );

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cart-fetch-"));
  try {
    for (const name of selectedNames) {
      const asset = assetsByName.get(name);
      if (asset === undefined) {
        throw new Error(`release asset "${name}" not found`);
      }
      const tempPath = path.join(tempDir, name);
      await client.downloadToFile(asset.url, tempPath);
      await saveArtefact(out, options.workDir, name, tempPath);
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
