import { isAddress, isHex, type Address, type Hex } from "viem";
import type { BootstrapAlg } from "./bootstrap-key.js";
import type { SignerRole } from "./signer-options.js";

export const PROPOSAL_KIND = "deploy-imutable";
export const PROPOSAL_VERSION = 1;

export type PublishMode = "eoa" | "safe";

/** Safe Transaction Builder-shaped transaction (to=null for EOA create). */
export type ProposalTransaction = {
  to: Address | null;
  value: string;
  data: Hex;
  operation: 0 | 1;
};

export type ProposalSafe = {
  address: Address;
  createCall: Address;
  salt: Hex;
  nonce: number;
  safeTxHash?: Hex;
};

export type Proposal = {
  kind: typeof PROPOSAL_KIND;
  version: typeof PROPOSAL_VERSION;
  chainId: number;
  bootstrapAlg: BootstrapAlg;
  bootstrapKey: Hex;
  /** Predicted (safe / CREATE2) or live-nonce-derived (eoa) address, if known. */
  imutableUnivocity: Address | null;
  publishMode: PublishMode;
  from: Address;
  signerRole: SignerRole;
  safe?: ProposalSafe;
  transactions: ProposalTransaction[];
};

export function serializeProposal(proposal: Proposal): string {
  return JSON.stringify(proposal, null, 2);
}

function fail(message: string): never {
  throw new Error(`invalid proposal: ${message}`);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asAddress(value: unknown, label: string): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    fail(`${label} must be an address`);
  }
  return value as Address;
}

function asHex(value: unknown, label: string): Hex {
  if (typeof value !== "string" || !isHex(value)) {
    fail(`${label} must be hex`);
  }
  return value as Hex;
}

function validateTransaction(value: unknown, i: number): ProposalTransaction {
  const tx = asRecord(value, `transactions[${i}]`);
  const to = tx.to === null ? null : asAddress(tx.to, `transactions[${i}].to`);
  if (typeof tx.value !== "string") {
    fail(`transactions[${i}].value must be a string`);
  }
  const data = asHex(tx.data, `transactions[${i}].data`);
  if (tx.operation !== 0 && tx.operation !== 1) {
    fail(`transactions[${i}].operation must be 0 or 1`);
  }
  return { to, value: tx.value, data, operation: tx.operation };
}

function validateSafe(value: unknown): ProposalSafe {
  const safe = asRecord(value, "safe");
  const result: ProposalSafe = {
    address: asAddress(safe.address, "safe.address"),
    createCall: asAddress(safe.createCall, "safe.createCall"),
    salt: asHex(safe.salt, "safe.salt"),
    nonce:
      typeof safe.nonce === "number"
        ? safe.nonce
        : fail("safe.nonce must be a number"),
  };
  if (safe.safeTxHash !== undefined) {
    result.safeTxHash = asHex(safe.safeTxHash, "safe.safeTxHash");
  }
  return result;
}

/** Validate an untrusted value into a Proposal, throwing on any defect. */
export function validateProposal(value: unknown): Proposal {
  const record = asRecord(value, "proposal");
  if (record.kind !== PROPOSAL_KIND) {
    fail(`kind must be "${PROPOSAL_KIND}"`);
  }
  if (record.version !== PROPOSAL_VERSION) {
    fail(`version must be ${PROPOSAL_VERSION}`);
  }
  if (typeof record.chainId !== "number") {
    fail("chainId must be a number");
  }
  if (record.bootstrapAlg !== "es256" && record.bootstrapAlg !== "ks256") {
    fail('bootstrapAlg must be "es256" or "ks256"');
  }
  if (record.publishMode !== "eoa" && record.publishMode !== "safe") {
    fail('publishMode must be "eoa" or "safe"');
  }
  if (
    record.signerRole !== "owner-address" &&
    record.signerRole !== "deploy-key" &&
    record.signerRole !== "deploy-address"
  ) {
    fail("signerRole is invalid");
  }
  if (
    !Array.isArray(record.transactions) ||
    record.transactions.length === 0
  ) {
    fail("transactions must be a non-empty array");
  }

  const proposal: Proposal = {
    kind: PROPOSAL_KIND,
    version: PROPOSAL_VERSION,
    chainId: record.chainId,
    bootstrapAlg: record.bootstrapAlg,
    bootstrapKey: asHex(record.bootstrapKey, "bootstrapKey"),
    imutableUnivocity:
      record.imutableUnivocity === null
        ? null
        : asAddress(record.imutableUnivocity, "imutableUnivocity"),
    publishMode: record.publishMode,
    from: asAddress(record.from, "from"),
    signerRole: record.signerRole,
    transactions: record.transactions.map(validateTransaction),
  };
  if (record.safe !== undefined) {
    proposal.safe = validateSafe(record.safe);
  }
  if (proposal.publishMode === "safe" && proposal.safe === undefined) {
    fail("safe proposals require a safe block");
  }
  return proposal;
}

/** Parse + validate a JSON proposal string. */
export function parseProposal(raw: string): Proposal {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `invalid proposal: not valid JSON (${(error as Error).message})`,
    );
  }
  return validateProposal(json);
}
