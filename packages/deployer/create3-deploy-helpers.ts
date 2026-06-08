import { keccak256, toBytes, type Hex } from "viem";

export const DEFAULT_CREATE3_SALT = "univocity-create3/1";

/** keccak256(bytes(saltString)) — matches cast keccak and Solidity. */
export function hashCreate3SaltString(saltString: string): Hex {
  return keccak256(toBytes(saltString));
}

/** Arachnid proxy calldata: saltHash || creationCode (without 0x on bytecode). */
export function encodeArachnidDeployCalldata(
  saltString: string,
  bytecode: Hex,
): Hex {
  const saltHash = hashCreate3SaltString(saltString);
  const codeBytes = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  return `0x${saltHash.slice(2)}${codeBytes}` as Hex;
}

export function hasContractCode(code: string | undefined): boolean {
  return code !== undefined && code.length > 0 && code !== "0x";
}

export function normalizePrivateKey(raw: string): Hex {
  const trimmed = raw.trim();
  if (trimmed.startsWith("0x")) {
    return trimmed as Hex;
  }
  return `0x${trimmed}` as Hex;
}

export function normalizeRpcUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("RPC URL is required (--rpc-url or RPC_URL)");
  }
  return trimmed;
}

export function resolvePrivateKey(args: {
  privateKey?: string | undefined;
  "private-key"?: string | undefined;
}): Hex {
  const raw =
    args.privateKey ??
    args["private-key"] ??
    process.env.PRIVATE_KEY ??
    process.env.DEPLOY_KEY;
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "Private key is required (--private-key, PRIVATE_KEY, or DEPLOY_KEY)",
    );
  }
  return normalizePrivateKey(raw);
}

export function resolveRpcUrl(args: {
  rpcUrl?: string | undefined;
  "rpc-url"?: string | undefined;
}): string {
  const raw = args.rpcUrl ?? args["rpc-url"] ?? process.env.RPC_URL;
  if (!raw) {
    throw new Error("RPC URL is required (--rpc-url or RPC_URL)");
  }
  return normalizeRpcUrl(raw);
}

export function resolveCreate3Salt(args: {
  create3Salt?: string | undefined;
  "create3-salt"?: string | undefined;
}): string {
  return (
    args.create3Salt ??
    args["create3-salt"] ??
    process.env.CREATE3_SALT ??
    DEFAULT_CREATE3_SALT
  );
}

export function buildDeployCalldata(
  saltString: string,
  bytecode: Hex,
): Hex {
  return encodeArachnidDeployCalldata(saltString, bytecode);
}
