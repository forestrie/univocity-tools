import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCaptureOut } from "@univocity-tools/cli-kit/reporting";
import { runExecuteProposal } from "../execute-proposal.js";
import { parseExecuteProposalOptions } from "../options.js";
import { serializeProposal, type Proposal } from "../proposal.js";

const ROOT = "/tmp/univocity";
const KEY_A =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const ADDR_A = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const OTHER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const EOA_PROPOSAL: Proposal = {
  kind: "deploy-imutable",
  version: 1,
  chainId: 84532,
  bootstrapAlg: "ks256",
  bootstrapKey: "0x1528b86ff561f617602356efdbd05908a07aa788",
  imutableUnivocity: null,
  publishMode: "eoa",
  from: ADDR_A,
  signerRole: "deploy-key",
  transactions: [{ to: null, value: "0", data: "0x6001", operation: 0 }],
};

describe("runExecuteProposal", () => {
  test("refuses Safe proposals", async () => {
    const out = createCaptureOut();
    const proposal: Proposal = {
      ...EOA_PROPOSAL,
      publishMode: "safe",
      from: "0x1528b86ff561f617602356efdbD05908a07AA788",
      safe: {
        address: "0x1528b86ff561f617602356efdbD05908a07AA788",
        createCall: "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4",
        salt: `0x${"cd".repeat(32)}`,
        nonce: 0,
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
    const dir = mkdtempSync(path.join(tmpdir(), "execute-proposal-"));
    const file = path.join(dir, "proposal.json");
    writeFileSync(file, serializeProposal(proposal));
    try {
      const options = parseExecuteProposalOptions({
        _: [file],
        "source-root": ROOT,
        "deploy-key": KEY_A,
        "rpc-url": "http://127.0.0.1:8545",
      });
      await expect(runExecuteProposal(out, options)).rejects.toThrow(
        "Safe proposal",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects signer/from mismatch", async () => {
    const out = createCaptureOut();
    const dir = mkdtempSync(path.join(tmpdir(), "execute-proposal-"));
    const file = path.join(dir, "proposal.json");
    writeFileSync(file, serializeProposal({ ...EOA_PROPOSAL, from: OTHER }));
    try {
      const options = parseExecuteProposalOptions({
        _: [file],
        "source-root": ROOT,
        "deploy-key": KEY_A,
        "rpc-url": "http://127.0.0.1:8545",
      });
      await expect(runExecuteProposal(out, options)).rejects.toThrow(
        "does not match proposal from",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("requires rpc-url", async () => {
    const out = createCaptureOut();
    const dir = mkdtempSync(path.join(tmpdir(), "execute-proposal-"));
    const file = path.join(dir, "proposal.json");
    writeFileSync(file, serializeProposal(EOA_PROPOSAL));
    try {
      const options = parseExecuteProposalOptions({
        _: [file],
        "source-root": ROOT,
        "deploy-key": KEY_A,
      });
      await expect(runExecuteProposal(out, options)).rejects.toThrow(
        "execute requires --rpc-url",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
