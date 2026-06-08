import {
  concat,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  getCreate2Address,
  keccak256,
  type Address,
  type Hex,
} from "viem";
import { PERFORM_CREATE2_SELECTOR } from "./deploy-constants.js";

/** Minimal CreateCall ABI: only `performCreate2`. */
export const CREATE_CALL_ABI = [
  {
    type: "function",
    name: "performCreate2",
    stateMutability: "payable",
    inputs: [
      { name: "value", type: "uint256" },
      { name: "deploymentData", type: "bytes" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [{ name: "newContract", type: "address" }],
  },
] as const;

/**
 * ImutableUnivocity deployment data: creation code followed by the
 * abi.encode'd constructor args `(int64 bootstrapAlg, bytes bootstrapKey)`.
 */
export function buildImutableDeploymentData(
  creationCode: Hex,
  bootstrapAlg: bigint,
  bootstrapKey: Hex,
): Hex {
  const encodedArgs = encodeAbiParameters(
    [{ type: "int64" }, { type: "bytes" }],
    [bootstrapAlg, bootstrapKey],
  );
  return concat([creationCode, encodedArgs]);
}

/** Predict the CREATE2 address for CreateCall.performCreate2. */
export function predictCreate2Address(
  createCall: Address,
  salt: Hex,
  deploymentData: Hex,
): Address {
  return getCreate2Address({
    from: createCall,
    salt,
    bytecode: deploymentData,
  });
}

/** Encode `performCreate2(0, deploymentData, salt)` calldata. */
export function encodePerformCreate2Calldata(
  deploymentData: Hex,
  salt: Hex,
): Hex {
  return encodeFunctionData({
    abi: CREATE_CALL_ABI,
    functionName: "performCreate2",
    args: [0n, deploymentData, salt],
  });
}

/**
 * Decode performCreate2 calldata and predict the deployed address (mirrors
 * `predict_immutable_univocity_from_create2_calldata`). Returns null if the
 * calldata is not a performCreate2 call.
 */
export function predictImutableFromPerformCreate2(
  createCall: Address,
  data: Hex,
): Address | null {
  if (!data.toLowerCase().startsWith(PERFORM_CREATE2_SELECTOR)) {
    return null;
  }
  const { args } = decodeFunctionData({ abi: CREATE_CALL_ABI, data });
  const [, deploymentData, salt] = args as readonly [bigint, Hex, Hex];
  return predictCreate2Address(createCall, salt, deploymentData);
}

/**
 * Default CREATE2 salt for the Safe path:
 * keccak256(abi.encodePacked("forestrie.eth/univocity/ImutableUnivocity/safe/",
 * safe)). Mirrors `_defaultSalt` in GenerateSafeImutableUnivocityBatch.
 */
export function defaultSafeBatchSalt(safe: Address): Hex {
  return keccak256(
    encodePacked(
      ["string", "address"],
      ["forestrie.eth/univocity/ImutableUnivocity/safe/", safe],
    ),
  );
}
