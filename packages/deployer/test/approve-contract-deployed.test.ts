import { afterEach, describe, expect, test } from "bun:test";
import { assertContractDeployedAt } from "../approve-proposal.js";
import { startJsonRpcStub } from "./helpers/json-rpc-stub.js";

describe("assertContractDeployedAt", () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    stop = undefined;
  });

  test("passes when bytecode is present", async () => {
    const address = "0x1111111111111111111111111111111111111111";
    const stub = startJsonRpcStub({
      bytecode: { [address.toLowerCase()]: "0x6001" },
    });
    stop = stub.stop;
    await expect(
      assertContractDeployedAt(stub.url, address),
    ).resolves.toBeUndefined();
  });

  test("throws when bytecode is empty", async () => {
    const address = "0x2222222222222222222222222222222222222222";
    const stub = startJsonRpcStub({ bytecode: {} });
    stop = stub.stop;
    await expect(assertContractDeployedAt(stub.url, address)).rejects.toThrow(
      "no contract code",
    );
  });
});
