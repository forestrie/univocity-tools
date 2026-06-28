import {
  validateDeployManifestContract,
  type DeployManifestContract,
} from "./deploy-manifest-contract.js";

export const DEPLOY_MANIFEST_VERSION = 1;

/** Deploy manifest published alongside Univocity release archives. */
export type DeployManifest = {
  version: typeof DEPLOY_MANIFEST_VERSION;
  releaseId: string;
  contracts: {
    ImutableUnivocity: DeployManifestContract;
    CREATE3Factory?: DeployManifestContract;
    UUPSUnivocity?: DeployManifestContract;
    ERC1967Proxy?: DeployManifestContract;
  };
};

function fail(message: string): never {
  throw new Error(`invalid deploy-manifest: ${message}`);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

/** Validate an untrusted deploy-manifest JSON value. */
export function validateDeployManifest(value: unknown): DeployManifest {
  const record = asRecord(value, "manifest");
  if (record.version !== DEPLOY_MANIFEST_VERSION) {
    fail(`version must be ${DEPLOY_MANIFEST_VERSION}`);
  }
  const releaseId = record.releaseId;
  if (typeof releaseId !== "string" || releaseId.length === 0) {
    fail("releaseId must be a non-empty string");
  }
  const contracts = asRecord(record.contracts, "contracts");
  const imutable = validateDeployManifestContract(
    contracts.ImutableUnivocity,
    "contracts.ImutableUnivocity",
  );
  const manifest: DeployManifest = {
    version: DEPLOY_MANIFEST_VERSION,
    releaseId,
    contracts: { ImutableUnivocity: imutable },
  };
  if (contracts.CREATE3Factory !== undefined) {
    manifest.contracts.CREATE3Factory = validateDeployManifestContract(
      contracts.CREATE3Factory,
      "contracts.CREATE3Factory",
    );
  }
  if (contracts.UUPSUnivocity !== undefined) {
    manifest.contracts.UUPSUnivocity = validateDeployManifestContract(
      contracts.UUPSUnivocity,
      "contracts.UUPSUnivocity",
    );
  }
  if (contracts.ERC1967Proxy !== undefined) {
    manifest.contracts.ERC1967Proxy = validateDeployManifestContract(
      contracts.ERC1967Proxy,
      "contracts.ERC1967Proxy",
    );
  }
  return manifest;
}

/** Parse + validate a deploy-manifest JSON string. */
export function parseDeployManifest(raw: string): DeployManifest {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `invalid deploy-manifest: not valid JSON (${(error as Error).message})`,
    );
  }
  return validateDeployManifest(json);
}
