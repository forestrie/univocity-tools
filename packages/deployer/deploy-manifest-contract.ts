import { isHex, type Hex } from "viem";

/** One deployable contract entry in a deploy-manifest. */
export type DeployManifestContract = {
  contractName: string;
  creationBytecode: Hex;
  bytecodeSha256: string;
  solcVersion: string;
  constructorAbi?: readonly unknown[];
};

function fail(message: string): never {
  throw new Error(`invalid deploy-manifest contract: ${message}`);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

/** Validate an untrusted contract entry. */
export function validateDeployManifestContract(
  value: unknown,
  label: string,
): DeployManifestContract {
  const record = asRecord(value, label);
  const contractName = record.contractName;
  if (typeof contractName !== "string" || contractName.length === 0) {
    fail(`${label}.contractName must be a non-empty string`);
  }
  const creationBytecode = record.creationBytecode;
  if (typeof creationBytecode !== "string" || !isHex(creationBytecode)) {
    fail(`${label}.creationBytecode must be hex`);
  }
  const bytecodeSha256 = record.bytecodeSha256;
  if (typeof bytecodeSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(bytecodeSha256)) {
    fail(`${label}.bytecodeSha256 must be a 64-char hex sha256 digest`);
  }
  const solcVersion = record.solcVersion;
  if (typeof solcVersion !== "string" || solcVersion.length === 0) {
    fail(`${label}.solcVersion must be a non-empty string`);
  }
  const result: DeployManifestContract = {
    contractName,
    creationBytecode: creationBytecode as Hex,
    bytecodeSha256: bytecodeSha256.toLowerCase(),
    solcVersion,
  };
  if (record.constructorAbi !== undefined) {
    if (!Array.isArray(record.constructorAbi)) {
      fail(`${label}.constructorAbi must be an array when present`);
    }
    result.constructorAbi = record.constructorAbi;
  }
  return result;
}
