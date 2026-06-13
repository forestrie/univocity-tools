import type { GithubClient } from "../client.js";
import { repoApiBase } from "../client.js";
import type { Artifact, ArtifactList } from "./artifact.js";

/** List workflow run artefacts for a run id. */
export async function listRunArtifacts(
  client: GithubClient,
  runId: number,
): Promise<Artifact[]> {
  const response = await client.getJson<ArtifactList>(
    `${repoApiBase(client)}/actions/runs/${runId}/artifacts`,
  );
  return response.artifacts.filter((artifact) => !artifact.expired);
}
