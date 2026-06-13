import type { GithubClient } from "../client.js";
import { repoApiBase } from "../client.js";

/** Download a workflow run artefact zip to a local path. */
export async function downloadArtifactZip(
  client: GithubClient,
  artifactId: number,
  destPath: string,
): Promise<void> {
  const url = `${repoApiBase(client)}/actions/artifacts/${artifactId}/zip`;
  await client.downloadToFile(url, destPath);
}
