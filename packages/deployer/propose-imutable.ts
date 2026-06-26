import type { Out } from "@univocity-tools/cli-kit/reporting";
import {
  requireForgeBin,
  requireCastBin,
  toFoundryExecContext,
} from "@univocity-tools/foundry-exec/require-bins";
import {
  createPublicClient,
  getContractAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import {
  generateEs256BootstrapKey,
  generateKs256BootstrapKey,
  resolveBootstrapKey,
  type BootstrapKeyInput,
} from "./bootstrap-key.js";
import { DEFAULT_CHAIN_ID } from "./deploy-constants.js";
import { readImutableFromDeployManifest } from "./read-deploy-manifest.js";
import {
  buildImutableArtifact,
  imutableArtifactPath,
  readImutableBytecode,
} from "./imutable-artifact.js";
import {
  buildImutableDeploymentData,
  defaultSafeBatchSalt,
  encodePerformCreate2Calldata,
  predictCreate2Address,
} from "./imutable-deploy-data.js";
import type { ProposeImutableOptions } from "./options.js";
import {
  serializeProposal,
  type Proposal,
  type ProposalTransaction,
} from "./proposal.js";
import {
  buildSafeTxFields,
  computeSafeTxHash,
  fetchSafeNonce,
  postSafeTransaction,
  safeDashboardUrl,
  signSafeTxHash,
} from "./safe-client.js";
import { privateKeyToAccount } from "viem/accounts";
import path from "node:path";

function bootstrapKeyInput(
  options: ProposeImutableOptions,
): BootstrapKeyInput {
  if (options.bootstrapAlg === "es256") {
    const input: BootstrapKeyInput = { alg: "es256" };
    if (options.es256Pem !== undefined) input.pem = options.es256Pem;
    if (options.es256Pub64 !== undefined) input.pub64 = options.es256Pub64;
    if (options.es256X !== undefined) input.x = options.es256X;
    if (options.es256Y !== undefined) input.y = options.es256Y;
    return input;
  }
  const signer =
    options.ks256Signer ?? (options.safePublish ? options.from : undefined);
  return { alg: "ks256", signer: signer ?? "" };
}

async function applyGeneratedBootstrapMaterial(
  out: Out,
  options: ProposeImutableOptions,
): Promise<ProposeImutableOptions> {
  if (options.es256Generate) {
    const generated = await generateEs256BootstrapKey();
    await Bun.write(options.es256PemOut!, generated.pem);
    out.print("Wrote ES256 bootstrap PEM to %s", options.es256PemOut);
    return {
      ...options,
      es256X: generated.x,
      es256Y: generated.y,
    };
  }
  if (options.ks256Generate) {
    const generated = generateKs256BootstrapKey();
    await Bun.write(options.ks256KeyOut!, `${generated.privateKey}\n`);
    out.print("Wrote KS256 bootstrap key to %s", options.ks256KeyOut);
    return {
      ...options,
      ks256Signer: generated.address,
    };
  }
  return options;
}

async function resolveChainId(
  options: ProposeImutableOptions,
): Promise<number> {
  if (options.chainId !== undefined) {
    return options.chainId;
  }
  if (options.rpcUrl === undefined) {
    return DEFAULT_CHAIN_ID;
  }
  const client = createPublicClient({ transport: http(options.rpcUrl) });
  const value = await client.getChainId();
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`rpc chain-id returned unexpected value: ${value}`);
  }
  return value;
}

async function predictEoaAddress(
  options: ProposeImutableOptions,
): Promise<Address | null> {
  if (options.rpcUrl === undefined) {
    return null;
  }
  const client = createPublicClient({ transport: http(options.rpcUrl) });
  const nonce = await client.getTransactionCount({ address: options.from });
  if (!Number.isInteger(nonce) || nonce < 0) {
    return null;
  }
  return getContractAddress({ from: options.from, nonce: BigInt(nonce) });
}

/** Build (and optionally Safe-publish) a deploy-imutable proposal. */
export async function runProposeImutable(
  out: Out,
  options: ProposeImutableOptions,
): Promise<void> {
  if (
    options.releaseRoot === undefined &&
    options.fromManifest === undefined
  ) {
    requireForgeBin(options);
    requireCastBin(options);
  }
  const execCwd =
    options.releaseRoot !== undefined || options.fromManifest !== undefined
      ? process.cwd()
      : options.univocityRoot;
  const ctx = toFoundryExecContext({
    forgeBin: options.forgeBin,
    castBin: options.castBin,
    out,
    cwd: execCwd,
  });

  const resolvedOptions = await applyGeneratedBootstrapMaterial(out, options);
  const bootstrap = await resolveBootstrapKey(
    bootstrapKeyInput(resolvedOptions),
  );
  const artifact =
    options.fromManifest !== undefined
      ? (
          await readImutableFromDeployManifest(
            options.fromManifest,
            options.insecure ? { insecure: true } : undefined,
          )
        ).artifact
      : options.releaseRoot !== undefined
        ? await readImutableBytecode(
            imutableArtifactPath(path.join(options.releaseRoot, "out")),
          )
        : await (async () => {
            out.print("Building ImutableUnivocity artifact...");
            return buildImutableArtifact(
              ctx,
              options.forgeConfig,
              options.outDir,
            );
          })();
  const deploymentData = buildImutableDeploymentData(
    artifact.bytecode,
    bootstrap.algId,
    bootstrap.key,
  );
  const chainId = await resolveChainId(resolvedOptions);

  if (!options.safePublish) {
    const tx: ProposalTransaction = {
      to: null,
      value: "0",
      data: deploymentData,
      operation: 0,
    };
    const predicted = await predictEoaAddress(resolvedOptions);
    const proposal: Proposal = {
      kind: "deploy-imutable",
      version: 1,
      chainId,
      bootstrapAlg: bootstrap.alg,
      bootstrapKey: bootstrap.key,
      imutableUnivocity: predicted,
      publishMode: "eoa",
      from: resolvedOptions.from,
      signerRole: resolvedOptions.signerRole,
      transactions: [tx],
    };
    await emitProposal(out, options, proposal);
    return;
  }

  await proposeSafe(
    out,
    resolvedOptions,
    chainId,
    deploymentData,
    bootstrap.alg,
    bootstrap.key,
  );
}

async function proposeSafe(
  out: Out,
  options: ProposeImutableOptions,
  chainId: number,
  deploymentData: Hex,
  bootstrapAlg: "es256" | "ks256",
  bootstrapKey: Hex,
): Promise<void> {
  if (options.rpcUrl === undefined) {
    throw new Error(
      "--safe-publish requires --rpc-url (or RPC_URL) for the Safe nonce",
    );
  }
  if (options.deployKey === undefined) {
    throw new Error(
      "--safe-publish requires --deploy-key to sign the Safe transaction",
    );
  }
  const safe = options.from;
  const createCall = options.createCallAddress;
  const salt = options.salt ?? defaultSafeBatchSalt(safe);
  const createData = encodePerformCreate2Calldata(deploymentData, salt);
  const predicted = predictCreate2Address(createCall, salt, deploymentData);
  const nonce = await fetchSafeNonce(options.rpcUrl, safe);

  const tx: ProposalTransaction = {
    to: createCall,
    value: "0",
    data: createData,
    operation: 0,
  };

  const safeTxFields = buildSafeTxFields({
    to: createCall,
    data: createData,
    operation: 0,
    nonce,
  });
  const safeTxHash = computeSafeTxHash(chainId, safe, safeTxFields);
  const signature = await signSafeTxHash(options.deployKey, safeTxHash);
  const sender = privateKeyToAccount(options.deployKey).address;

  out.print(
    "Posting SafeTx %s to %s...",
    safeTxHash,
    options.safeTxServiceUrl,
  );
  await postSafeTransaction({
    serviceUrl: options.safeTxServiceUrl,
    chainId,
    safe,
    tx: safeTxFields,
    safeTxHash,
    sender,
    signature,
  });
  out.print("Safe proposal: %s", safeDashboardUrl(safe, safeTxHash));

  const proposal: Proposal = {
    kind: "deploy-imutable",
    version: 1,
    chainId,
    bootstrapAlg,
    bootstrapKey,
    imutableUnivocity: predicted,
    publishMode: "safe",
    from: safe,
    signerRole: options.signerRole,
    safe: {
      address: safe,
      createCall,
      salt,
      nonce: Number(nonce),
      safeTxHash,
    },
    transactions: [tx],
  };
  await emitProposal(out, options, proposal);
}

async function emitProposal(
  out: Out,
  options: ProposeImutableOptions,
  proposal: Proposal,
): Promise<void> {
  const json = serializeProposal(proposal);
  if (options.outPath !== undefined) {
    await Bun.write(options.outPath, `${json}\n`);
    out.print("Wrote proposal to %s", options.outPath);
    return;
  }
  out.out("%s", json);
}
