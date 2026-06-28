import { describe, expect, test } from "vitest";
import { baseSepolia } from "@privy-io/chains";
import { getPrivyDeploySupportedChains } from "../src/lib/privy-chains.js";

describe("getPrivyDeploySupportedChains", () => {
  test("defaults Privy embedded wallet to Base Sepolia", () => {
    const chains = getPrivyDeploySupportedChains();
    expect(chains[0]?.id).toBe(baseSepolia.id);
    expect(chains[0]?.id).toBe(84532);
  });
});
