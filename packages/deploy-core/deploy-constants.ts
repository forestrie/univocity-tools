import type { Address } from "viem";

/**
 * Chain / Safe constants for the ImutableUnivocity deploy flow. Defaults
 * target Base Sepolia and the shared Gnosis Safe + CreateCall deployments.
 */

/** COSE algorithm IDs (see src/cosecbor/constants.sol). */
export const ALG_ES256 = -7n;
export const ALG_KS256 = -65799n;

/** Base Sepolia. */
export const DEFAULT_CHAIN_ID = 84532;

/** Shared multisig used as the deploy `from` / KS256 bootstrap signer. */
export const DEFAULT_SAFE: Address =
  "0x1528b86ff561f617602356efdbD05908a07AA788";

/** Gnosis CreateCall library (performCreate2). */
export const DEFAULT_CREATE_CALL: Address =
  "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4";

/** Default Safe contract version for SafeTx EIP-712 hashing. */
export const DEFAULT_SAFE_VERSION = "1.4.1";

/** Safe Transaction Service base URL for Base Sepolia. */
export const DEFAULT_SAFE_TX_SERVICE_URL =
  "https://safe-transaction-base-sepolia.safe.global";

/** `bytes4(keccak256("performCreate2(uint256,bytes,bytes32)"))`. */
export const PERFORM_CREATE2_SELECTOR = "0x4847be6f";

/** Default Univocity release tag for deploy-manifest fetch. */
export const DEFAULT_RELEASE_TAG = "v0.1.4";

/** GitHub org/repo for Univocity contract releases. */
export const UNIVOCITY_RELEASES_BASE =
  "https://github.com/forestrie/univocity/releases/download";
