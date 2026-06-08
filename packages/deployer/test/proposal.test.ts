import { describe, expect, test } from "bun:test";
import {
  parseProposal,
  serializeProposal,
  validateProposal,
  type Proposal,
} from "../proposal.js";

const EOA_PROPOSAL: Proposal = {
  kind: "deploy-imutable",
  version: 1,
  chainId: 84532,
  bootstrapAlg: "ks256",
  bootstrapKey: "0x1528b86ff561f617602356efdbd05908a07aa788",
  imutableUnivocity: null,
  publishMode: "eoa",
  from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  signerRole: "deploy-key",
  transactions: [{ to: null, value: "0", data: "0x6001", operation: 0 }],
};

const SAFE_PROPOSAL: Proposal = {
  kind: "deploy-imutable",
  version: 1,
  chainId: 84532,
  bootstrapAlg: "ks256",
  bootstrapKey: "0x1528b86ff561f617602356efdbd05908a07aa788",
  imutableUnivocity: "0x611dd70B2D36c87B29878089eD8a7aDc68E4441B",
  publishMode: "safe",
  from: "0x1528b86ff561f617602356efdbD05908a07AA788",
  signerRole: "owner-address",
  safe: {
    address: "0x1528b86ff561f617602356efdbD05908a07AA788",
    createCall: "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4",
    salt: `0x${"cd".repeat(32)}`,
    nonce: 7,
    safeTxHash: `0x${"ab".repeat(32)}`,
  },
  transactions: [
    {
      to: "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4",
      value: "0",
      data: "0x4847be6f",
      operation: 0,
    },
  ],
};

describe("proposal round-trip", () => {
  test("eoa proposal serializes and parses back", () => {
    expect(parseProposal(serializeProposal(EOA_PROPOSAL))).toEqual(
      EOA_PROPOSAL,
    );
  });

  test("safe proposal serializes and parses back", () => {
    expect(parseProposal(serializeProposal(SAFE_PROPOSAL))).toEqual(
      SAFE_PROPOSAL,
    );
  });
});

describe("validateProposal", () => {
  test("rejects wrong kind", () => {
    expect(() => validateProposal({ ...EOA_PROPOSAL, kind: "nope" })).toThrow(
      'kind must be "deploy-imutable"',
    );
  });

  test("rejects wrong version", () => {
    expect(() => validateProposal({ ...EOA_PROPOSAL, version: 2 })).toThrow(
      "version must be 1",
    );
  });

  test("rejects empty transactions", () => {
    expect(() =>
      validateProposal({ ...EOA_PROPOSAL, transactions: [] }),
    ).toThrow("transactions must be a non-empty array");
  });

  test("rejects safe publishMode without safe block", () => {
    const { safe, ...rest } = SAFE_PROPOSAL;
    void safe;
    expect(() => validateProposal(rest)).toThrow(
      "safe proposals require a safe block",
    );
  });

  test("rejects bad operation", () => {
    expect(() =>
      validateProposal({
        ...EOA_PROPOSAL,
        transactions: [{ to: null, value: "0", data: "0x", operation: 2 }],
      }),
    ).toThrow("operation must be 0 or 1");
  });
});

describe("parseProposal", () => {
  test("rejects invalid JSON", () => {
    expect(() => parseProposal("{not json")).toThrow("not valid JSON");
  });
});
