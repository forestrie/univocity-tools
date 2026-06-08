import type { Create3Config } from "@univocity-tools/create3-options/create3-config";
import {
  toFoundryExecContext,
  requireCastBin,
  requireForgeBin,
} from "@univocity-tools/foundry-exec/require-bins";
import { runCast, runForge } from "@univocity-tools/foundry-exec/spawn";
import {
  createPublicClient,
  getCreate2Address,
  http,
  keccak256,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildDeployCalldata,
  hashCreate3SaltString,
  hasContractCode,
} from "./create3-deploy-helpers.js";
import {
  create3FactoryArtifactPath,
  create3FactoryForgeConfigPath,
} from "./create3-factory-paths.js";
import type { DeployCreate3Options } from "./options.js";
import { readFactoryBytecode } from "./read-factory-bytecode.js";

const PROXY_POLL_MS = 500;
const PROXY_POLL_MAX = 60;

async function castCode(
  options: DeployCreate3Options,
  address: string,
): Promise<string> {
  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    verbose: options.verbose,
    cwd: options.univocityRoot,
  });
  const { stdout } = await runCast(ctx, [
    "code",
    address,
    "--rpc-url",
    options.rpcUrl,
  ]);
  return stdout.trim();
}

async function buildCreate3Factory(
  options: DeployCreate3Options,
): Promise<void> {
  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    verbose: options.verbose,
    cwd: options.univocityRoot,
  });
  const configPath = create3FactoryForgeConfigPath(options.univocityRoot);
  await runForge(ctx, ["build", "--config-path", configPath]);
}

async function ensureArachnidProxy(
  options: DeployCreate3Options,
  create3: Create3Config,
): Promise<void> {
  const proxyCode = await castCode(options, create3.proxy);
  if (hasContractCode(proxyCode)) {
    if (options.verbose) {
      console.error(`Arachnid proxy already at ${create3.proxy}`);
    }
    return;
  }

  const client = createPublicClient({ transport: http(options.rpcUrl) });
  const balance = await client.getBalance({ address: create3.signer });
  if (balance === 0n) {
    throw new Error(
      `Arachnid deployment signer ${create3.signer} has no funds; ` +
        "send ETH to deploy the proxy via the pre-signed transaction",
    );
  }

  console.error(`Deploying Arachnid proxy to ${create3.proxy}...`);
  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    verbose: options.verbose,
    cwd: options.univocityRoot,
  });
  await runCast(ctx, [
    "rpc",
    "eth_sendRawTransaction",
    create3["deploy-tx"],
    "--rpc-url",
    options.rpcUrl,
  ]);

  for (let attempt = 0; attempt < PROXY_POLL_MAX; attempt++) {
    const code = await castCode(options, create3.proxy);
    if (hasContractCode(code)) {
      console.error(`Arachnid proxy deployed at ${create3.proxy}`);
      return;
    }
    await Bun.sleep(PROXY_POLL_MS);
  }

  throw new Error(
    `Timed out waiting for Arachnid proxy code at ${create3.proxy}`,
  );
}

function warnIfFactoryAddressMismatch(
  options: DeployCreate3Options,
  bytecode: Hex,
  create3: Create3Config,
): void {
  const saltHash = hashCreate3SaltString(options.create3Salt);
  const initCodeHash = keccak256(bytecode);
  const computed = getCreate2Address({
    bytecodeHash: initCodeHash,
    from: create3.proxy,
    salt: saltHash,
  });
  if (computed.toLowerCase() !== create3.factory.toLowerCase()) {
    console.error(
      `WARNING: salt "${options.create3Salt}" + bytecode would deploy to ` +
        `${computed}, not configured factory ${create3.factory}`,
    );
  }
}

async function deployCreate3Factory(
  options: DeployCreate3Options,
  create3: Create3Config,
  bytecode: Hex,
): Promise<void> {
  const account = privateKeyToAccount(options.privateKey);
  const client = createPublicClient({ transport: http(options.rpcUrl) });
  const balance = await client.getBalance({ address: account.address });
  if (balance === 0n) {
    throw new Error(
      `Deployer ${account.address} has no funds for CREATE3 factory deployment`,
    );
  }

  warnIfFactoryAddressMismatch(options, bytecode, create3);

  const calldata = buildDeployCalldata(options.create3Salt, bytecode);
  console.error(
    `Deploying CREATE3 factory via Arachnid ${create3.proxy} ` +
      `(expected ${create3.factory})...`,
  );

  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    verbose: options.verbose,
    cwd: options.univocityRoot,
  });
  const { stdout } = await runCast(ctx, [
    "send",
    create3.proxy,
    calldata,
    "--private-key",
    options.privateKey,
    "--rpc-url",
    options.rpcUrl,
    "--json",
  ]);

  if (options.verbose) {
    console.error(stdout);
  }

  const parsed: unknown = JSON.parse(stdout);
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    "status" in parsed &&
    parsed.status !== "0x1" &&
    parsed.status !== 1 &&
    parsed.status !== "1"
  ) {
    throw new Error(`CREATE3 factory deployment failed: ${stdout}`);
  }
}

/** Deploy the shared CREATE3 factory via Arachnid if not already deployed. */
export async function runDeployCreate3(
  options: DeployCreate3Options,
): Promise<void> {
  requireForgeBin(options);
  requireCastBin(options);

  const create3 = options.create3;

  const factoryCode = await castCode(options, create3.factory);
  if (hasContractCode(factoryCode)) {
    console.log(`CREATE3 factory already deployed at ${create3.factory}`);
    return;
  }

  await buildCreate3Factory(options);
  const artifact = await readFactoryBytecode(
    create3FactoryArtifactPath(options.univocityRoot),
  );

  await ensureArachnidProxy(options, create3);
  await deployCreate3Factory(options, create3, artifact.bytecode);

  const deployedCode = await castCode(options, create3.factory);
  if (!hasContractCode(deployedCode)) {
    throw new Error(
      `CREATE3 factory still has no code at ${create3.factory} after deployment`,
    );
  }

  console.log(`CREATE3 factory deployed at ${create3.factory}`);
}
