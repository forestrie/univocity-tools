import type { Create3Config } from "@univocity-tools/create3-options/create3-config";
import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  toFoundryExecContext,
  requireCastBin,
  requireForgeBin,
} from "@univocity-tools/foundry-exec/require-bins";
import { runForge } from "@univocity-tools/foundry-exec/spawn";
import {
  createPublicClient,
  createWalletClient,
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
  create3FactoryReleaseArtifactPath,
} from "./create3-factory-paths.js";
import type { DeployCreate3Options } from "./options.js";
import { createRpcClients, hasBytecodeAt } from "./rpc-client.js";
import { readFactoryBytecode } from "./read-factory-bytecode.js";

const PROXY_POLL_MS = 500;
const PROXY_POLL_MAX = 60;

async function getCode(
  rpcUrl: string,
  address: string,
): Promise<string> {
  const client = createPublicClient({ transport: http(rpcUrl) });
  const code = await client.getBytecode({ address: address as `0x${string}` });
  return code ?? "0x";
}

async function buildCreate3Factory(
  out: Out,
  options: DeployCreate3Options,
): Promise<void> {
  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    out,
    cwd: options.univocityRoot,
  });
  const configPath = create3FactoryForgeConfigPath(options.univocityRoot);
  await runForge(ctx, ["build", "--config-path", configPath]);
}

async function ensureArachnidProxy(
  out: Out,
  options: DeployCreate3Options,
  create3: Create3Config,
): Promise<void> {
  const proxyCode = await getCode(options.rpcUrl, create3.proxy);
  if (hasContractCode(proxyCode)) {
    out.log("Arachnid proxy already at %s", create3.proxy);
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

  out.print("Deploying Arachnid proxy to %s...", create3.proxy);
  const hash = await client.sendRawTransaction({
    serializedTransaction: create3["deploy-tx"] as Hex,
  });
  out.print("Arachnid proxy deploy tx: %s", hash);

  for (let attempt = 0; attempt < PROXY_POLL_MAX; attempt++) {
    const code = await getCode(options.rpcUrl, create3.proxy);
    if (hasContractCode(code)) {
      out.print("Arachnid proxy deployed at %s", create3.proxy);
      return;
    }
    await Bun.sleep(PROXY_POLL_MS);
  }

  throw new Error(
    `Timed out waiting for Arachnid proxy code at ${create3.proxy}`,
  );
}

function warnIfFactoryAddressMismatch(
  out: Out,
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
    out.warn(
      'WARNING: salt "%s" + bytecode would deploy to %s, not configured factory %s',
      options.create3Salt,
      computed,
      create3.factory,
    );
  }
}

async function deployCreate3Factory(
  out: Out,
  options: DeployCreate3Options,
  create3: Create3Config,
  bytecode: Hex,
): Promise<void> {
  const { publicClient, walletClient, account } = createRpcClients(
    options.rpcUrl,
    options.deployKey,
  );
  const balance = await publicClient.getBalance({ address: account.address });
  if (balance === 0n) {
    throw new Error(
      `Deployer ${account.address} has no funds for CREATE3 factory deployment`,
    );
  }

  warnIfFactoryAddressMismatch(out, options, bytecode, create3);

  const calldata = buildDeployCalldata(options.create3Salt, bytecode);
  out.print(
    "Deploying CREATE3 factory via Arachnid %s (expected %s)...",
    create3.proxy,
    create3.factory,
  );

  const hash = await walletClient.sendTransaction({
    account,
    chain: null,
    to: create3.proxy,
    data: calldata,
    value: 0n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`CREATE3 factory deployment failed: ${hash}`);
  }
  out.print("CREATE3 factory deployment tx: %s", hash);
}

/** Deploy the shared CREATE3 factory via Arachnid if not already deployed. */
export async function runDeployCreate3(
  out: Out,
  options: DeployCreate3Options,
): Promise<void> {
  if (options.releaseRoot === undefined) {
    requireForgeBin(options);
    requireCastBin(options);
  }

  const create3 = options.create3;

  const factoryCode = await getCode(options.rpcUrl, create3.factory);
  if (hasContractCode(factoryCode)) {
    out.out("CREATE3 factory already deployed at %s", create3.factory);
    return;
  }

  const artifact =
    options.releaseRoot !== undefined
      ? await readFactoryBytecode(
          create3FactoryReleaseArtifactPath(options.releaseRoot),
        )
      : await (async () => {
          await buildCreate3Factory(out, options);
          return readFactoryBytecode(
            create3FactoryArtifactPath(options.univocityRoot),
          );
        })();

  await ensureArachnidProxy(out, options, create3);
  await deployCreate3Factory(out, options, create3, artifact.bytecode);

  const deployed = await hasBytecodeAt(
    createPublicClient({ transport: http(options.rpcUrl) }),
    create3.factory,
  );
  if (!deployed) {
    throw new Error(
      `CREATE3 factory still has no code at ${create3.factory} after deployment`,
    );
  }

  out.out("CREATE3 factory deployed at %s", create3.factory);
}
