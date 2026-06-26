import path from "node:path";

export const CREATE3_FACTORY_FORGE_CONFIG =
  "script/create3-factory/foundry.toml";

export const CREATE3_FACTORY_ARTIFACT_REL =
  "script/create3-factory/out/CREATE3Factory.sol/CREATE3Factory.json";

export function create3FactoryForgeConfigPath(univocityRoot: string): string {
  return path.join(univocityRoot, CREATE3_FACTORY_FORGE_CONFIG);
}

export function create3FactoryArtifactPath(univocityRoot: string): string {
  return path.join(univocityRoot, CREATE3_FACTORY_ARTIFACT_REL);
}

export const CREATE3_FACTORY_RELEASE_ARTIFACT_REL =
  "CREATE3Factory.sol/CREATE3Factory.json";

/** Factory artifact path under an extracted create3-factory release root. */
export function create3FactoryReleaseArtifactPath(releaseRoot: string): string {
  return path.join(releaseRoot, "out", CREATE3_FACTORY_RELEASE_ARTIFACT_REL);
}
