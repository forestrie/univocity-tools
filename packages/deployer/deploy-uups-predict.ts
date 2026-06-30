import type { Out } from "@univocity-tools/cli-kit/reporting";
import { predictCreate3Address } from "@univocity-tools/deploy-core";
import { privateKeyToAccount } from "viem/accounts";
import type { DeployUupsPredictOptions } from "./options.js";

/** Print predicted UUPSUnivocity CREATE3 proxy address for the deployer key. */
export async function runDeployUupsPredict(
  out: Out,
  options: DeployUupsPredictOptions,
): Promise<void> {
  const deployer = privateKeyToAccount(options.deployKey).address;
  const predicted = predictCreate3Address(
    deployer,
    options.proxySalt,
    options.create3.factory,
  );
  if (options.mintedLogId && options.logId !== undefined) {
    out.print("Minted forest logId: %s", options.logId);
  }
  if (options.logId !== undefined) {
    out.print("Forest logId: %s", options.logId);
  }
  out.out("%s", predicted);
}
