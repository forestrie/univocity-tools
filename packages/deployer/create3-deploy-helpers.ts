import { evaluateOptionValue } from "@univocity-tools/cli-kit";
import { CREATE3_DEFAULTS } from "@univocity-tools/create3-options/defaults";
import { keccak256, toBytes, type Hex } from "viem";

export const DEFAULT_CREATE3_SALT = "forestrie.eth/univocity/CREATE3Factory/0";

export const DEFAULT_UUPS_SALT = CREATE3_DEFAULTS["uups-salt"];

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

export function resolveRpcUrl(args: {
  rpcUrl?: string | undefined;
  "rpc-url"?: string | undefined;
}): string {
  const raw =
    evaluateOptionValue("rpc-url", args.rpcUrl ?? args["rpc-url"]) ??
    process.env.RPC_URL;
  if (!raw) {
    throw new Error("RPC URL is required (--rpc-url or RPC_URL)");
  }
  return normalizeRpcUrl(raw);
}

/** Resolve the RPC URL if available, else undefined (no throw). */
export function resolveOptionalRpcUrl(args: {
  rpcUrl?: string | undefined;
  "rpc-url"?: string | undefined;
}): string | undefined {
  const raw =
    evaluateOptionValue("rpc-url", args.rpcUrl ?? args["rpc-url"]) ??
    process.env.RPC_URL;
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }
  return normalizeRpcUrl(raw);
}

export function resolveCreate3Salt(args: {
  create3Salt?: string | undefined;
  "create3-salt"?: string | undefined;
}): string {
  return (
    evaluateOptionValue(
      "create3-salt",
      args.create3Salt ?? args["create3-salt"],
    ) ??
    process.env.CREATE3_SALT ??
    DEFAULT_CREATE3_SALT
  );
}

export type ProxySaltArgSlice = {
  proxySalt?: string | undefined;
  "proxy-salt"?: string | undefined;
};

export function resolveProxySalt(args: ProxySaltArgSlice): string {
  return (
    evaluateOptionValue("proxy-salt", args.proxySalt ?? args["proxy-salt"]) ??
    process.env.UUPS_PROXY_SALT ??
    DEFAULT_UUPS_SALT
  );
}

export function buildDeployCalldata(saltString: string, bytecode: Hex): Hex {
  return encodeArachnidDeployCalldata(saltString, bytecode);
}
