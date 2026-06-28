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
  out.out("%s", predicted);
}
