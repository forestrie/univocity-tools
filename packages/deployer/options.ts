import {
  optionNameToEnvVar,
  parseCommonOptions,
  readEvaluatedStringOption,
  resolveReleaseRoot,
  type LooseParsedArgs,
} from "@univocity-tools/cli-kit";
import type { Create3Config } from "@univocity-tools/create3-options/create3-config";
import { parseCreate3Options } from "@univocity-tools/create3-options/options";
import type { FoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import { parseFoundryBinOptions } from "@univocity-tools/foundry-exec/options";
import type { ForgeOptions } from "@univocity-tools/forge-options/options";
import { parseForgeOptions } from "@univocity-tools/forge-options/options";
import type { AuthKind } from "@univocity-tools/git-options/options";
import path from "node:path";
import { getAddress, isHex, size, type Address, type Hex } from "viem";
import type { BootstrapAlg } from "./bootstrap-key.js";
import {
  resolveCreate3Salt,
  resolveOptionalRpcUrl,
  resolveRpcUrl,
} from "./create3-deploy-helpers.js";
import {
  DEFAULT_CREATE_CALL,
  DEFAULT_SAFE_TX_SERVICE_URL,
} from "./deploy-constants.js";
import {
  optionalDeployKey,
  resolveDeployKey,
  resolveExecuteSigner,
  resolveProposeFrom,
  type ExecuteSigner,
  type SignerRole,
} from "./signer-options.js";

/** Contracts repo checkout — the univocity-specific name for `sourceRoot`. */
export const UNIVOCITY_GIT_REPO_NAME = "univocity";

/** Flags shared by every deployer command (after parsing). */
export type DeployerCommonOptions = {
  /** Contracts checkout root — absolute path after parsing. */
  univocityRoot: string;
  workDir: string;
  create3: Create3Config;
} & ForgeOptions &
  FoundryBinOptions;

type CommonArgSlice = {
  sourceRoot?: string | undefined;
  "source-root"?: string | undefined;
  workDir?: string | undefined;
  "work-dir"?: string | undefined;
  forgeConfig?: string | undefined;
  "forge-config"?: string | undefined;
  buildRoot?: string | undefined;
  "build-root"?: string | undefined;
  foundryOut?: string | undefined;
  "foundry-out"?: string | undefined;
  foundrySrc?: string | undefined;
  "foundry-src"?: string | undefined;
  foundryCache?: string | undefined;
  "foundry-cache"?: string | undefined;
  foundryLibs?: string | undefined;
  "foundry-libs"?: string | undefined;
  create3Config?: string | undefined;
  "create3-config"?: string | undefined;
  forgeBin?: string | undefined;
  "forge-bin"?: string | undefined;
  castBin?: string | undefined;
  "cast-bin"?: string | undefined;
};

export function parseDeployerCommonOptions(
  args: CommonArgSlice,
): DeployerCommonOptions {
  const common = parseCommonOptions(args, {
    gitRepoName: UNIVOCITY_GIT_REPO_NAME,
  });
  return {
    univocityRoot: common.sourceRoot,
    workDir: common.workDir,
    create3: parseCreate3Options(args),
    ...parseForgeOptions(args, common.sourceRoot),
    ...parseFoundryBinOptions(args),
  };
}

type RpcArgSlice = {
  rpcUrl?: string | undefined;
  "rpc-url"?: string | undefined;
};

export type ConfigShowOptions = DeployerCommonOptions;

export function parseConfigShowOptions(
  args: LooseParsedArgs,
): ConfigShowOptions {
  return parseDeployerCommonOptions(args as CommonArgSlice);
}

export type DeployCreate3Options = DeployerCommonOptions & {
  rpcUrl: string;
  deployKey: Hex;
  create3Salt: string;
  /** Extracted create3-factory release root (skips forge build). */
  releaseRoot?: string;
  /** Deploy manifest with CREATE3Factory bytecode (foundry-free). */
  fromManifest?: string;
  /** Allow CREATE3 deploy when computed address differs from config. */
  forceFactoryDeploy?: boolean;
};

type DeployCreate3ArgSlice = CommonArgSlice & {
  rpcUrl?: string | undefined;
  "rpc-url"?: string | undefined;
  deployKey?: string | undefined;
  "deploy-key"?: string | undefined;
  create3Salt?: string | undefined;
  "create3-salt"?: string | undefined;
  fromManifest?: string | undefined;
  "from-manifest"?: string | undefined;
  forceFactoryDeploy?: boolean | undefined;
  "force-factory-deploy"?: boolean | undefined;
};

export function parseDeployCreate3Options(
  args: LooseParsedArgs,
): DeployCreate3Options {
  const slice = args as DeployCreate3ArgSlice;
  const releaseRoot = resolveReleaseRoot(args);
  const options: DeployCreate3Options = {
    ...parseDeployerCommonOptions(slice),
    rpcUrl: resolveRpcUrl(slice),
    deployKey: resolveDeployKey(slice),
    create3Salt: resolveCreate3Salt(slice),
  };
  if (releaseRoot !== undefined) {
    options.releaseRoot = releaseRoot;
  }
  const fromManifest = readOption(args, "from-manifest", "DEPLOY_MANIFEST");
  if (fromManifest !== undefined) {
    options.fromManifest = fromManifest;
  }
  if (
    options.releaseRoot !== undefined &&
    options.fromManifest !== undefined
  ) {
    throw new Error(
      "--release-root and --from-manifest are mutually exclusive",
    );
  }
  if (Boolean(args["force-factory-deploy"] ?? args.forceFactoryDeploy)) {
    options.forceFactoryDeploy = true;
  }
  return options;
}

/**
 * Read an option from a flag (kebab/camel, with `${env:VAR}` evaluation),
 * falling back to a specific env var name when the flag is absent.
 */
function readOption(
  args: LooseParsedArgs,
  optionName: string,
  envVar: string = optionNameToEnvVar(optionName),
): string | undefined {
  const fromFlag = readEvaluatedStringOption(
    args as Record<string, unknown>,
    optionName,
  );
  if (fromFlag !== undefined && fromFlag.trim().length > 0) {
    return fromFlag.trim();
  }
  const env = process.env[envVar];
  if (env !== undefined && env.trim().length > 0) {
    return env.trim();
  }
  return undefined;
}

function parseBootstrapAlg(args: LooseParsedArgs): BootstrapAlg {
  const raw = readOption(args, "bootstrap-alg", "BOOTSTRAP_ALG");
  const alg = raw?.toLowerCase();
  if (alg !== "es256" && alg !== "ks256") {
    throw new Error(
      "--bootstrap-alg (or BOOTSTRAP_ALG) must be es256 or ks256",
    );
  }
  return alg;
}

function parseSaltOption(args: LooseParsedArgs): Hex | undefined {
  const raw = readOption(args, "salt", "SAFE_BATCH_SALT");
  if (raw === undefined) {
    return undefined;
  }
  const hex = (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
  if (!isHex(hex) || size(hex) !== 32) {
    throw new Error("--salt must be a 32-byte hex value");
  }
  return hex;
}

function parseChainIdOption(args: LooseParsedArgs): number | undefined {
  const raw = readOption(args, "chain-id", "CHAIN_ID");
  if (raw === undefined) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("--chain-id must be a positive integer");
  }
  return value;
}

export type ProposeImutableOptions = DeployerCommonOptions & {
  bootstrapAlg: BootstrapAlg;
  es256Generate: boolean;
  es256PemOut?: string;
  es256Pem?: string;
  es256Pub64?: string;
  es256X?: string;
  es256Y?: string;
  ks256Generate: boolean;
  ks256KeyOut?: string;
  ks256Signer?: string;
  safePublish: boolean;
  from: Address;
  signerRole: SignerRole;
  deployKey?: Hex;
  createCallAddress: Address;
  salt?: Hex;
  chainId?: number;
  rpcUrl?: string;
  safeTxServiceUrl: string;
  outPath?: string;
  /** Extracted build archive root (from archive-extract --release-root). */
  releaseRoot?: string;
  /** Deploy manifest file or URL (from Univocity release). */
  fromManifest?: string;
  /** Local sha256 sidecar for --from-manifest (env: DEPLOY_MANIFEST_SIDECAR). */
  manifestSidecar?: string;
  /** Allow http:// manifest URLs (local dev). */
  insecure?: boolean;
};

export function parseProposeImutableOptions(
  args: LooseParsedArgs,
): ProposeImutableOptions {
  const common = parseDeployerCommonOptions(args as CommonArgSlice);
  const { from, role } = resolveProposeFrom(args);
  const createCallRaw =
    readOption(args, "create-call-address", "CREATE_CALL_ADDRESS") ??
    DEFAULT_CREATE_CALL;
  const serviceUrl =
    readOption(args, "safe-tx-service-url", "SAFE_TX_SERVICE_URL") ??
    DEFAULT_SAFE_TX_SERVICE_URL;

  const options: ProposeImutableOptions = {
    ...common,
    bootstrapAlg: parseBootstrapAlg(args),
    es256Generate: Boolean(
      args["bootstrap-es256-generate"] ?? args.bootstrapEs256Generate,
    ),
    ks256Generate: Boolean(
      args["bootstrap-ks256-generate"] ?? args.bootstrapKs256Generate,
    ),
    safePublish: Boolean(args["safe-publish"] ?? args.safePublish),
    from,
    signerRole: role,
    createCallAddress: getAddress(createCallRaw),
    safeTxServiceUrl: serviceUrl,
  };

  const es256PemOut = readOption(args, "bootstrap-es256-pem-out");
  if (es256PemOut !== undefined) options.es256PemOut = es256PemOut;
  const ks256KeyOut = readOption(args, "bootstrap-ks256-key-out");
  if (ks256KeyOut !== undefined) options.ks256KeyOut = ks256KeyOut;

  const es256Pem = readOption(
    args,
    "bootstrap-es256-pem",
    "BOOTSTRAP_PEM_ES256",
  );
  if (es256Pem !== undefined) options.es256Pem = es256Pem;
  const es256Pub64 = readOption(
    args,
    "bootstrap-es256-pub",
    "BOOTSTRAP_PUB_ES256",
  );
  if (es256Pub64 !== undefined) options.es256Pub64 = es256Pub64;
  const es256X = readOption(args, "bootstrap-es256-x", "ES256_X");
  if (es256X !== undefined) options.es256X = es256X;
  const es256Y = readOption(args, "bootstrap-es256-y", "ES256_Y");
  if (es256Y !== undefined) options.es256Y = es256Y;
  const ks256Signer = readOption(
    args,
    "bootstrap-ks256-signer",
    "KS256_SIGNER",
  );
  if (ks256Signer !== undefined) options.ks256Signer = ks256Signer;

  if (options.es256Generate && options.bootstrapAlg !== "es256") {
    throw new Error(
      "--bootstrap-es256-generate requires --bootstrap-alg es256",
    );
  }
  if (options.ks256Generate && options.bootstrapAlg !== "ks256") {
    throw new Error(
      "--bootstrap-ks256-generate requires --bootstrap-alg ks256",
    );
  }
  if (options.es256Generate) {
    if (options.es256PemOut === undefined) {
      throw new Error(
        "--bootstrap-es256-generate requires --bootstrap-es256-pem-out",
      );
    }
    const hasExplicitEs256 =
      options.es256Pem !== undefined ||
      options.es256Pub64 !== undefined ||
      options.es256X !== undefined ||
      options.es256Y !== undefined;
    if (hasExplicitEs256) {
      throw new Error(
        "--bootstrap-es256-generate is mutually exclusive with explicit ES256 bootstrap material",
      );
    }
  }
  if (options.ks256Generate) {
    if (options.ks256KeyOut === undefined) {
      throw new Error(
        "--bootstrap-ks256-generate requires --bootstrap-ks256-key-out",
      );
    }
    if (options.ks256Signer !== undefined) {
      throw new Error(
        "--bootstrap-ks256-generate is mutually exclusive with --bootstrap-ks256-signer",
      );
    }
  }

  const deployKey = optionalDeployKey(args);
  if (deployKey !== undefined) options.deployKey = deployKey;
  const salt = parseSaltOption(args);
  if (salt !== undefined) options.salt = salt;
  const chainId = parseChainIdOption(args);
  if (chainId !== undefined) options.chainId = chainId;
  const rpcUrl = resolveOptionalRpcUrl(args as RpcArgSlice);
  if (rpcUrl !== undefined) options.rpcUrl = rpcUrl;
  const outPath = readOption(args, "out", "DEPLOY_PROPOSAL_OUT");
  if (outPath !== undefined) options.outPath = outPath;

  const releaseRoot = resolveReleaseRoot(args);
  if (releaseRoot !== undefined) options.releaseRoot = releaseRoot;

  const fromManifest = readOption(args, "from-manifest", "DEPLOY_MANIFEST");
  if (fromManifest !== undefined) options.fromManifest = fromManifest;
  const manifestSidecar = readOption(
    args,
    "manifest-sidecar",
    "DEPLOY_MANIFEST_SIDECAR",
  );
  if (manifestSidecar !== undefined) {
    options.manifestSidecar = manifestSidecar;
  }
  if (Boolean(args.insecure)) {
    options.insecure = true;
  }
  if (
    options.releaseRoot !== undefined &&
    options.fromManifest !== undefined
  ) {
    throw new Error(
      "--release-root and --from-manifest are mutually exclusive",
    );
  }

  return options;
}

export type DeployImutableFromReleaseOptions = ProposeImutableOptions & {
  fromRelease: string;
  deploymentManifestOut?: string;
};

export function parseDeployImutableFromReleaseOptions(
  args: LooseParsedArgs,
): DeployImutableFromReleaseOptions {
  const base = parseProposeImutableOptions(args);
  const fromRelease = readOption(args, "from-release", "FROM_RELEASE");
  if (fromRelease === undefined) {
    throw new Error("--from-release (or FROM_RELEASE) is required");
  }
  const options: DeployImutableFromReleaseOptions = {
    ...base,
    fromRelease,
  };
  const manifestOut = readOption(args, "deployment-manifest-out");
  if (manifestOut !== undefined) {
    options.deploymentManifestOut = manifestOut;
  }
  return options;
}

export type ExecuteProposalOptions = DeployerCommonOptions & {
  proposalFile?: string;
  signer: ExecuteSigner;
  rpcUrl?: string;
};

export type ApproveProposalOptions = DeployerCommonOptions & {
  proposalFile?: string;
  signer: ExecuteSigner;
  rpcUrl: string;
  safeTxServiceUrl: string;
  safeTxHash?: Hex;
  confirmOnly: boolean;
};

export function parseExecuteProposalOptions(
  args: LooseParsedArgs,
): ExecuteProposalOptions {
  const common = parseDeployerCommonOptions(args as CommonArgSlice);
  const positionals = Array.isArray(args._) ? (args._ as string[]) : [];
  const proposalFile =
    typeof args.proposalFile === "string" ? args.proposalFile : positionals[0];

  const options: ExecuteProposalOptions = {
    ...common,
    signer: resolveExecuteSigner(args),
  };
  if (proposalFile !== undefined) options.proposalFile = proposalFile;
  const rpcUrl = resolveOptionalRpcUrl(args as RpcArgSlice);
  if (rpcUrl !== undefined) options.rpcUrl = rpcUrl;

  return options;
}

export function parseApproveProposalOptions(
  args: LooseParsedArgs,
): ApproveProposalOptions {
  const common = parseDeployerCommonOptions(args as CommonArgSlice);
  const positionals = Array.isArray(args._) ? (args._ as string[]) : [];
  const proposalFile =
    typeof args.proposalFile === "string" ? args.proposalFile : positionals[0];

  const rpcUrl = resolveOptionalRpcUrl(args as RpcArgSlice);
  if (rpcUrl === undefined) {
    throw new Error("approve requires --rpc-url (or RPC_URL)");
  }

  const serviceUrl =
    readOption(args, "safe-tx-service-url", "SAFE_TX_SERVICE_URL") ??
    DEFAULT_SAFE_TX_SERVICE_URL;

  const options: ApproveProposalOptions = {
    ...common,
    signer: resolveExecuteSigner(args),
    rpcUrl,
    safeTxServiceUrl: serviceUrl,
    confirmOnly: Boolean(args["confirm-only"] ?? args.confirmOnly),
  };
  if (proposalFile !== undefined) options.proposalFile = proposalFile;

  const safeTxHashRaw = readOption(args, "safe-tx-hash", "SAFE_TX_HASH");
  if (safeTxHashRaw !== undefined) {
    const hex = (
      safeTxHashRaw.startsWith("0x") ? safeTxHashRaw : `0x${safeTxHashRaw}`
    ) as Hex;
    if (!isHex(hex) || size(hex) !== 32) {
      throw new Error("--safe-tx-hash must be a 32-byte hex value");
    }
    options.safeTxHash = hex;
  }

  return options;
}

export type ProvisionImutableE2eOptions =
  import("./provision-imutable-e2e.js").ProvisionImutableE2eOptions;

function readPathOption(
  args: LooseParsedArgs,
  optionName: string,
): string | undefined {
  return readEvaluatedStringOption(
    args as Record<string, unknown>,
    optionName,
  );
}

function parseBootstrapAlgList(
  args: LooseParsedArgs,
): BootstrapAlg[] | undefined {
  const raw =
    readPathOption(args, "alg") ?? readPathOption(args, "bootstrap-alg");
  if (raw === undefined) {
    return undefined;
  }
  if (raw === "es256" || raw === "ks256") {
    return [raw];
  }
  throw new Error('--alg must be "es256" or "ks256"');
}

export function parseProvisionImutableE2eOptions(
  args: LooseParsedArgs,
): ProvisionImutableE2eOptions {
  const common = parseDeployerCommonOptions(args as CommonArgSlice);
  const deployKey = resolveDeployKey(args);
  const rpcUrl = resolveRpcUrl(args as RpcArgSlice);
  const releaseRoot = resolveReleaseRoot(args);
  const runId =
    readPathOption(args, "run-id") ?? process.env.E2E_PROVISION_RUN_ID?.trim();
  const proposalDir =
    readPathOption(args, "proposal-dir") ??
    path.join(common.workDir, "univocity-e2e", "proposals");
  const es256PemOut =
    readPathOption(args, "bootstrap-es256-pem-out") ??
    path.join(common.workDir, "e2e-univocity-es256-bootstrap.pem");
  const ks256KeyOut =
    readPathOption(args, "bootstrap-ks256-key-out") ??
    path.join(common.workDir, "e2e-univocity-ks256-bootstrap.key");
  const skipFetch = Boolean(args["skip-fetch"] ?? args.skipFetch);
  const fetchAuthKindRaw = readPathOption(args, "fetch-auth-kind");
  const fetchAuthKind: AuthKind =
    fetchAuthKindRaw === "env" || fetchAuthKindRaw === "gh-cli"
      ? fetchAuthKindRaw
      : "gh-cli";

  const options: ProvisionImutableE2eOptions = {
    ...common,
    rpcUrl,
    deployKey,
    proposalDir: path.resolve(proposalDir),
    es256PemOut: path.resolve(es256PemOut),
    ks256KeyOut: path.resolve(ks256KeyOut),
    skipFetch,
    fetchAuthKind,
  };
  if (releaseRoot !== undefined) {
    options.releaseRoot = path.resolve(releaseRoot);
  }
  if (runId !== undefined && runId.length > 0) {
    options.runId = runId;
  }
  const algs = parseBootstrapAlgList(args);
  if (algs !== undefined) {
    options.algs = algs;
  }
  const fetchOrg = readPathOption(args, "fetch-org");
  if (fetchOrg !== undefined) options.fetchOrg = fetchOrg;
  const fetchRepo = readPathOption(args, "fetch-repo");
  if (fetchRepo !== undefined) options.fetchRepo = fetchRepo;
  const fetchArtefact = readPathOption(args, "fetch-artefact");
  if (fetchArtefact !== undefined) options.fetchArtefact = fetchArtefact;

  return options;
}
