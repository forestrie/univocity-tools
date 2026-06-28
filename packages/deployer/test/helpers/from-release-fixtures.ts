import { writeFileSync } from "node:fs";
import type {
  GithubClient,
  ReleaseAsset,
} from "@univocity-tools/github-api/main";

export const FIXTURE_MANIFEST = {
  version: 1,
  releaseId: "v0.4.0",
  contracts: {
    ImutableUnivocity: {
      contractName: "ImutableUnivocity",
      creationBytecode: "0x6001",
      bytecodeSha256:
        "9e67b12fd8c58953460459cad7a6d4dd7d6d57594affce8206d1397c9c4db543",
      solcVersion: "0.8.26",
      constructorAbi: [],
    },
  },
};

export const FIXTURE_MANIFEST_WITH_FACTORY = {
  ...FIXTURE_MANIFEST,
  contracts: {
    ...FIXTURE_MANIFEST.contracts,
    CREATE3Factory: {
      contractName: "CREATE3Factory",
      creationBytecode: "0x6001",
      bytecodeSha256:
        "9e67b12fd8c58953460459cad7a6d4dd7d6d57594affce8206d1397c9c4db543",
      solcVersion: "0.8.26",
    },
  },
};

export function releaseAsset(name: string, url: string): ReleaseAsset {
  return {
    id: 1,
    name,
    url,
    browser_download_url: url,
  };
}

export function stubGithubClient(config: {
  assets: ReleaseAsset[];
  tag?: string;
  downloads?: Record<string, string>;
}): GithubClient {
  const downloads = config.downloads ?? {};
  return {
    org: "forestrie",
    repo: "univocity",
    async getJson<T>(apiPath: string): Promise<T> {
      if (apiPath.includes("/releases/tags/")) {
        return {
          tag_name: config.tag ?? "v0.4.0",
          assets: config.assets,
        } as T;
      }
      throw new Error(`unexpected api path ${apiPath}`);
    },
    async downloadToFile(url: string, destPath: string): Promise<void> {
      const content = downloads[url];
      if (content === undefined) {
        throw new Error(`unexpected download url ${url}`);
      }
      writeFileSync(destPath, content);
    },
  };
}
