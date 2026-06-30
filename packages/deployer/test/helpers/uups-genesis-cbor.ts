import { decode as decodeCbor, encode as encodeCbor } from "cbor-x";

const LABEL_GENESIS_VERSION = -68009;
const LABEL_GENESIS_ALG = -68014;
const LABEL_BOOTSTRAP_KEY = -68015;
const LABEL_BOOTSTRAP_LOG_ID = -68010;
const LABEL_UNIVOCITY_ADDR = -68011;
const LABEL_CHAIN_ID = -68013;
const LABEL_UNIVOCITY_VARIANT = -68016;
const LABEL_UNIVOCITY_DEPLOYER = -68017;
const SCHEMA_V2 = 2;
const VARIANT_UUPS = "uups-counterfactual";
const COSE_ALG_KS256 = -65799;

function hexToBytes20(hex: string): Uint8Array {
  const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(20);
  for (let i = 0; i < 20; i += 1) {
    out[i] = Number.parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function uuidToPaddedLogIdBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  const wire = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    wire[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const padded = new Uint8Array(32);
  padded.set(wire, 16);
  return padded;
}

/** Build v2 genesis CBOR for uups-counterfactual (canopy C2 binding). */
export function buildUupsCounterfactualGenesisBody(opts: {
  logId: string;
  chainId: string;
  proxyAddress: string;
  deployerAddress: string;
  bootstrapKeyAddress: string;
}): Uint8Array {
  return encodeCbor(
    new Map<number, unknown>([
      [LABEL_GENESIS_VERSION, SCHEMA_V2],
      [LABEL_GENESIS_ALG, COSE_ALG_KS256],
      [LABEL_BOOTSTRAP_KEY, hexToBytes20(opts.bootstrapKeyAddress)],
      [LABEL_BOOTSTRAP_LOG_ID, uuidToPaddedLogIdBytes(opts.logId)],
      [LABEL_UNIVOCITY_ADDR, hexToBytes20(opts.proxyAddress)],
      [LABEL_CHAIN_ID, opts.chainId],
      [LABEL_UNIVOCITY_VARIANT, VARIANT_UUPS],
      [LABEL_UNIVOCITY_DEPLOYER, hexToBytes20(opts.deployerAddress)],
    ]),
  ) as Uint8Array;
}

export function decodeGenesisCborMap(body: Uint8Array): Map<number, unknown> {
  const decoded = decodeCbor(body);
  if (!(decoded instanceof Map)) {
    throw new Error("expected genesis CBOR map");
  }
  return decoded as Map<number, unknown>;
}

export const UUPS_GENESIS_LABELS = {
  LABEL_GENESIS_VERSION,
  LABEL_UNIVOCITY_VARIANT,
  LABEL_UNIVOCITY_DEPLOYER,
  LABEL_BOOTSTRAP_LOG_ID,
  VARIANT_UUPS,
} as const;
