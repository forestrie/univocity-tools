import {
  encodePacked,
  getContractAddress,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";

/** Solmate CREATE3 proxy init code (matches solmate CREATE3.PROXY_BYTECODE). */
export const CREATE3_PROXY_BYTECODE =
  "0x67363d3d37363d34f03d5260086018f3" as const;

/** keccak256(CREATE3_PROXY_BYTECODE) — used in CREATE2 address derivation. */
export const CREATE3_PROXY_BYTECODE_HASH = keccak256(CREATE3_PROXY_BYTECODE);

/**
 * Predict the address of a contract deployed via the shared CREATE3 factory.
 * Ports univocity `LibCreate3Address.getDeployed`.
 */
export function predictCreate3Address(
  deployer: Address,
  saltString: string,
  factory: Address,
): Address {
  const salt = keccak256(toBytes(saltString));
  const hashedSalt = keccak256(
    encodePacked(["address", "bytes32"], [deployer, salt]),
  );
  return predictCreate3AddressWithHashedSalt(hashedSalt, factory);
}

/** Predict address given keccak256(abi.encodePacked(deployer, salt)). */
export function predictCreate3AddressWithHashedSalt(
  hashedSalt: Hex,
  factory: Address,
): Address {
  const proxy = getContractAddress({
    bytecodeHash: CREATE3_PROXY_BYTECODE_HASH,
    from: factory,
    opcode: "CREATE2",
    salt: hashedSalt,
  });
  return getContractAddress({
    from: proxy,
    nonce: 1n,
  });
}

/** keccak256(bytes(saltString)) for factory.deploy(bytes32,bytes). */
export function hashProxySaltString(saltString: string): Hex {
  return keccak256(toBytes(saltString));
}
