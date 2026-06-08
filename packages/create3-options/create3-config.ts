export type Create3Config = {
  proxy: `0x${string}`;
  "deploy-tx": `0x${string}`;
  signer: `0x${string}`;
  factory: `0x${string}`;
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_RE = /^0x[0-9a-fA-F]+$/;

const REQUIRED_KEYS = ["proxy", "deploy-tx", "signer", "factory"] as const;

export function validateCreate3Config(value: unknown): Create3Config {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("create3 config must be a JSON object");
  }

  const record = value as Record<string, unknown>;

  for (const key of REQUIRED_KEYS) {
    if (!(key in record)) {
      throw new Error(`create3 config missing required field: ${key}`);
    }
  }

  const proxy = record.proxy;
  const deployTx = record["deploy-tx"];
  const signer = record.signer;
  const factory = record.factory;

  if (typeof proxy !== "string" || !ADDRESS_RE.test(proxy)) {
    throw new Error(
      "create3 config field proxy must be a 0x-prefixed address",
    );
  }
  if (typeof deployTx !== "string" || !HEX_RE.test(deployTx)) {
    throw new Error("create3 config field deploy-tx must be 0x-prefixed hex");
  }
  if (typeof signer !== "string" || !ADDRESS_RE.test(signer)) {
    throw new Error(
      "create3 config field signer must be a 0x-prefixed address",
    );
  }
  if (typeof factory !== "string" || !ADDRESS_RE.test(factory)) {
    throw new Error(
      "create3 config field factory must be a 0x-prefixed address",
    );
  }

  return {
    proxy: proxy as Create3Config["proxy"],
    "deploy-tx": deployTx as Create3Config["deploy-tx"],
    signer: signer as Create3Config["signer"],
    factory: factory as Create3Config["factory"],
  };
}
