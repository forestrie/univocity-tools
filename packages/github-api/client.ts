import fs from "node:fs/promises";
import path from "node:path";

const GITHUB_API = "https://api.github.com";

export type GithubClient = {
  org: string;
  repo: string;
  getJson: <T>(apiPath: string) => Promise<T>;
  downloadToFile: (url: string, destPath: string) => Promise<void>;
};

export type CreateGithubClientOptions = {
  org: string;
  repo: string;
  token: string;
};

/** Create a GitHub REST client scoped to one org/repo. */
export function createGithubClient(
  options: CreateGithubClientOptions,
): GithubClient {
  const { org, repo, token } = options;
  const repoBase = `/repos/${org}/${repo}`;

  async function githubFetch(
    apiPath: string,
    init?: RequestInit,
  ): Promise<Response> {
    const url = apiPath.startsWith("http")
      ? apiPath
      : `${GITHUB_API}${apiPath}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok && response.status !== 302 && response.status !== 307) {
      const body = await response.text();
      throw new Error(
        `GitHub API ${response.status} ${response.statusText}: ${body}`,
      );
    }
    return response;
  }

  return {
    org,
    repo,
    async getJson<T>(apiPath: string): Promise<T> {
      const response = await githubFetch(apiPath);
      return (await response.json()) as T;
    },
    async downloadToFile(url: string, destPath: string): Promise<void> {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      const response = await githubFetch(url, {
        headers: { Accept: "application/octet-stream" },
        redirect: "manual",
      });

      if (response.status === 302 || response.status === 307) {
        const location = response.headers.get("location");
        if (location === null || location.length === 0) {
          throw new Error(`GitHub download redirect missing Location header`);
        }
        const storageResponse = await fetch(location);
        if (!storageResponse.ok) {
          const body = await storageResponse.text();
          throw new Error(
            `artifact storage download failed (${storageResponse.status}): ${body}`,
          );
        }
        const bytes = await storageResponse.arrayBuffer();
        await fs.writeFile(destPath, new Uint8Array(bytes));
        return;
      }

      const bytes = await response.arrayBuffer();
      await fs.writeFile(destPath, new Uint8Array(bytes));
    },
  };
}

export function repoApiBase(client: GithubClient): string {
  return `/repos/${client.org}/${client.repo}`;
}
