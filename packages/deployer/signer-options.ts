import {
  optionNameToEnvVar,
  readEvaluatedStringOption,
  type LooseParsedArgs,
} from "@univocity-tools/cli-kit";
import { getAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { normalizePrivateKey } from "./create3-deploy-helpers.js";
import type { ArgsDef } from "citty";

/** Citty flags shared by the deploy suite for signer / from resolution. */
export const signerArgs = {
  "owner-address": {
    type: "string",
    description:
      "Address that is the `from` for all proposal transactions (EOA or Safe)",
    valueHint: "address",
  },
  "deploy-key": {
    type: "string",
    description:
      "Shared deploy private key (sensitive). Used as the propose `from` " +
      "fallback and as the execute / safe-publish signing key",
    valueHint: "hex",
  },
  "deploy-address": {
    type: "string",
    description:
      "Convenience deployer address used for the propose `from` when " +
      "--deploy-key is not supplied (propose only)",
    valueHint: "address",
  },
  "owner-signer": {
    type: "string",
    description:
      "Owner private key used to sign and broadcast (execute only; never " +
      "used by propose)",
    valueHint: "hex",
  },
} as const satisfies ArgsDef;

/**
 * Read a signer option from a flag (kebab or camel, with `${env:VAR}`
 * evaluation), falling back to the canonical env var when the flag is absent.
 */
function readSignerOption(
  args: LooseParsedArgs,
  optionName: string,
): string | undefined {
  const fromFlag = readEvaluatedStringOption(
    args as Record<string, unknown>,
    optionName,
  );
  if (fromFlag !== undefined && fromFlag.trim().length > 0) {
    return fromFlag.trim();
  }
  const env = process.env[optionNameToEnvVar(optionName)];
  if (env !== undefined && env.trim().length > 0) {
    return env.trim();
  }
  return undefined;
}

export function resolveOwnerAddress(
  args: LooseParsedArgs,
): Address | undefined {
  const raw = readSignerOption(args, "owner-address");
  return raw === undefined ? undefined : getAddress(raw);
}

export function resolveDeployAddress(
  args: LooseParsedArgs,
): Address | undefined {
  const raw = readSignerOption(args, "deploy-address");
  return raw === undefined ? undefined : getAddress(raw);
}

/** Resolve the deploy key if present, else undefined. */
export function optionalDeployKey(args: LooseParsedArgs): Hex | undefined {
  const raw = readSignerOption(args, "deploy-key");
  return raw === undefined ? undefined : normalizePrivateKey(raw);
}

/** Resolve the deploy key or throw. */
export function resolveDeployKey(args: LooseParsedArgs): Hex {
  const key = optionalDeployKey(args);
  if (key === undefined) {
    throw new Error("Deploy key is required (--deploy-key or DEPLOY_KEY)");
  }
  return key;
}

function optionalOwnerSigner(args: LooseParsedArgs): Hex | undefined {
  const raw = readSignerOption(args, "owner-signer");
  return raw === undefined ? undefined : normalizePrivateKey(raw);
}

export type SignerRole = "owner-address" | "deploy-key" | "deploy-address";

export type ProposeFrom = {
  /** Address recorded as the proposal `from` for every transaction. */
  from: Address;
  role: SignerRole;
};

/**
 * Resolve the proposal `from`. Explicit --owner-address wins (production
 * multisig); otherwise the address is derived from --deploy-key (dev
 * convenience; pre-empts --deploy-address), then --deploy-address.
 */
export function resolveProposeFrom(args: LooseParsedArgs): ProposeFrom {
  const owner = resolveOwnerAddress(args);
  if (owner !== undefined) {
    return { from: owner, role: "owner-address" };
  }
  const deployKey = optionalDeployKey(args);
  if (deployKey !== undefined) {
    return {
      from: privateKeyToAccount(deployKey).address,
      role: "deploy-key",
    };
  }
  const deployAddress = resolveDeployAddress(args);
  if (deployAddress !== undefined) {
    return { from: deployAddress, role: "deploy-address" };
  }
  throw new Error(
    "propose requires a `from`: set --owner-address, --deploy-key, or " +
      "--deploy-address (or OWNER_ADDRESS / DEPLOY_KEY / DEPLOY_ADDRESS)",
  );
}

export type ExecuteSigner = {
  key: Hex;
  address: Address;
};

/**
 * Resolve the execute-time signing key: prefer --owner-signer, fall back to
 * --deploy-key. (--deploy-address is not accepted: execute needs a key.)
 */
export function resolveExecuteSigner(args: LooseParsedArgs): ExecuteSigner {
  const ownerSigner = optionalOwnerSigner(args);
  if (ownerSigner !== undefined) {
    return {
      key: ownerSigner,
      address: privateKeyToAccount(ownerSigner).address,
    };
  }
  const deployKey = optionalDeployKey(args);
  if (deployKey !== undefined) {
    return { key: deployKey, address: privateKeyToAccount(deployKey).address };
  }
  throw new Error(
    "execute requires a signing key: set --owner-signer or --deploy-key " +
      "(or OWNER_SIGNER / DEPLOY_KEY)",
  );
}
