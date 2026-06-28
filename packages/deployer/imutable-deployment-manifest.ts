import { getAddress, isAddress, type Address } from "viem";
import type { BootstrapAlg } from "./bootstrap-key.js";
import type { PublishMode } from "./proposal.js";

export const IMMUTABLE_DEPLOYMENT_KIND = "imutable-deployment";
export const IMMUTABLE_DEPLOYMENT_VERSION = 1;

export type ImutableDeploymentManifest = {
  kind: typeof IMMUTABLE_DEPLOYMENT_KIND;
  version: typeof IMMUTABLE_DEPLOYMENT_VERSION;
  bootstrapAlg: BootstrapAlg;
  chainId: number;
  imutableUnivocity: Address;
  publishMode: PublishMode;
  from: Address;
};

function fail(message: string): never {
  throw new Error(`invalid imutable deployment manifest: ${message}`);
}

export function validateImutableDeploymentManifest(
  value: unknown,
): ImutableDeploymentManifest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.kind !== IMMUTABLE_DEPLOYMENT_KIND) {
    fail(`kind must be "${IMMUTABLE_DEPLOYMENT_KIND}"`);
  }
  if (record.version !== IMMUTABLE_DEPLOYMENT_VERSION) {
    fail(`version must be ${IMMUTABLE_DEPLOYMENT_VERSION}`);
  }
  if (record.bootstrapAlg !== "es256" && record.bootstrapAlg !== "ks256") {
    fail('bootstrapAlg must be "es256" or "ks256"');
  }
  if (typeof record.chainId !== "number") {
    fail("chainId must be a number");
  }
  if (record.publishMode !== "eoa" && record.publishMode !== "safe") {
    fail('publishMode must be "eoa" or "safe"');
  }
  if (
    typeof record.imutableUnivocity !== "string" ||
    !isAddress(record.imutableUnivocity)
  ) {
    fail("imutableUnivocity must be an address");
  }
  if (typeof record.from !== "string" || !isAddress(record.from)) {
    fail("from must be an address");
  }
  return {
    kind: IMMUTABLE_DEPLOYMENT_KIND,
    version: IMMUTABLE_DEPLOYMENT_VERSION,
    bootstrapAlg: record.bootstrapAlg,
    chainId: record.chainId,
    publishMode: record.publishMode,
    imutableUnivocity: getAddress(record.imutableUnivocity),
    from: getAddress(record.from),
  };
}

export function parseImutableDeploymentManifest(
  raw: string,
): ImutableDeploymentManifest {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `invalid imutable deployment manifest: not valid JSON (${(error as Error).message})`,
    );
  }
  return validateImutableDeploymentManifest(json);
}

export async function readImutableDeploymentManifest(
  filePath: string,
): Promise<ImutableDeploymentManifest> {
  return parseImutableDeploymentManifest(await Bun.file(filePath).text());
}

export function serializeImutableDeploymentManifest(
  manifest: ImutableDeploymentManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export async function writeImutableDeploymentManifest(
  filePath: string,
  manifest: ImutableDeploymentManifest,
): Promise<void> {
  await Bun.write(filePath, serializeImutableDeploymentManifest(manifest));
}
