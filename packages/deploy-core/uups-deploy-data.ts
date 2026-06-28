import {
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";
import type { BootstrapKey } from "./bootstrap-key.js";

const UUPS_INITIALIZE_ABI = [
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "bootstrapAlg_", type: "int64" },
      { name: "bootstrapKey_", type: "bytes" },
      { name: "upgradeAdmin_", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/** Encode UUPSUnivocity.initialize(alg, key, upgradeAdmin). */
export function encodeUupsInitializeData(
  bootstrap: BootstrapKey,
  upgradeAdmin: Address,
): Hex {
  return encodeFunctionData({
    abi: UUPS_INITIALIZE_ABI,
    functionName: "initialize",
    args: [bootstrap.algId, bootstrap.key, upgradeAdmin],
  });
}
export function buildErc1967ProxyCreationCode(
  proxyCreationBytecode: Hex,
  implementation: Address,
  initData: Hex,
): Hex {
  const constructorArgs = encodeAbiParameters(
    [{ type: "address" }, { type: "bytes" }],
    [implementation, initData],
  );
  return concat([proxyCreationBytecode, constructorArgs]);
}

/** CREATE3Factory.deploy(bytes32,bytes) calldata. */
export function encodeFactoryDeployCalldata(
  salt: Hex,
  creationCode: Hex,
): Hex {
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "deploy",
        inputs: [
          { name: "salt", type: "bytes32" },
          { name: "creationCode", type: "bytes" },
        ],
        outputs: [{ name: "deployed", type: "address" }],
        stateMutability: "payable",
      },
    ],
    functionName: "deploy",
    args: [salt, creationCode],
  });
}
