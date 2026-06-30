import { getAddress, type Address } from "viem";

export type UupsDeploymentManifest = {
  kind: "uups-deployment";
  version: 1;
  chainId: number;
  deployer: Address;
  logId?: string;
  saltString: string;
  proxy: Address;
  implementation: Address;
  upgradeAdmin: Address;
  bootstrapAlg: string;
  releaseTag?: string;
  /** SHA-256 of on-chain implementation runtime bytecode (see ADR-0010). */
  implementationBytecodeSha256?: string;
  /** SHA-256 of release UUPSUnivocity creationBytecode at deploy time. */
  releaseUupsBytecodeSha256?: string;
};

export function parseUupsDeploymentManifestJson(
  raw: string,
): UupsDeploymentManifest {
  const parsed = JSON.parse(raw) as UupsDeploymentManifest;
  if (parsed.kind !== "uups-deployment" || parsed.version !== 1) {
    throw new Error("expected uups-deployment manifest version 1");
  }
  if (!parsed.deployer || !parsed.saltString || !parsed.proxy) {
    throw new Error(
      "deployment manifest missing deployer, saltString, or proxy",
    );
  }
  return {
    ...parsed,
    deployer: getAddress(parsed.deployer),
    proxy: getAddress(parsed.proxy),
    implementation: getAddress(parsed.implementation),
    upgradeAdmin: getAddress(parsed.upgradeAdmin),
  };
}
