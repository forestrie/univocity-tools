import type { GithubClient } from "../client.js";
import { repoApiBase } from "../client.js";
import type { Release } from "./release.js";

/** Fetch the latest GitHub release for the client repo. */
export async function getLatestRelease(
  client: GithubClient,
): Promise<Release> {
  return client.getJson<Release>(`${repoApiBase(client)}/releases/latest`);
}

/** Fetch a GitHub release by tag name. */
export async function getReleaseByTag(
  client: GithubClient,
  tag: string,
): Promise<Release> {
  const encoded = encodeURIComponent(tag);
  return client.getJson<Release>(
    `${repoApiBase(client)}/releases/tags/${encoded}`,
  );
}
