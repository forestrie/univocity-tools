import { readEvaluatedStringOption } from "@univocity-tools/cli-kit";
import type { LooseParsedArgs } from "@univocity-tools/cli-kit";
import { uupsProxySaltString } from "@univocity-tools/deploy-core";
import { randomUUID } from "node:crypto";
import { getAddress, type Address } from "viem";
import type { Out } from "@univocity-tools/cli-kit/reporting";
import type { BootstrapAlg } from "./bootstrap-key.js";

export type UupsSaltResolution = {
  proxySalt: string;
  /** Dashed UUID when counterfactual; absent for legacy fixed salt. */
  logId?: string;
  mintedLogId: boolean;
};

function readLogIdOption(args: LooseParsedArgs): string | undefined {
  const fromFlag = readEvaluatedStringOption(
    args as Record<string, unknown>,
    "log-id",
  );
  if (fromFlag !== undefined && fromFlag.trim().length > 0) {
    return fromFlag.trim();
  }
  const env = process.env.LOG_ID?.trim();
  return env && env.length > 0 ? env : undefined;
}

function readExplicitProxySalt(args: LooseParsedArgs): string | undefined {
  const fromFlag = readEvaluatedStringOption(
    args as Record<string, unknown>,
    "proxy-salt",
  );
  if (fromFlag !== undefined && fromFlag.trim().length > 0) {
    return fromFlag.trim();
  }
  const env = process.env.UUPS_PROXY_SALT?.trim();
  return env && env.length > 0 ? env : undefined;
}

/** Mint a forest logId UUID (RFC 4122 v4). */
export function mintForestLogId(): string {
  return randomUUID();
}

/**
 * Resolve CREATE3 proxy salt for UUPS deploy/predict.
 * Legacy `--proxy-salt` wins; otherwise counterfactual salt from `--log-id` or a
 * freshly minted UUID.
 */
export function resolveUupsSaltAndLogId(
  args: LooseParsedArgs,
  mintLogId: () => string = mintForestLogId,
): UupsSaltResolution {
  const explicitProxySalt = readExplicitProxySalt(args);
  if (explicitProxySalt !== undefined) {
    return {
      proxySalt: explicitProxySalt,
      mintedLogId: false,
    };
  }

  const providedLogId = readLogIdOption(args);
  const logId = providedLogId ?? mintLogId();
  return {
    proxySalt: uupsProxySaltString(logId),
    logId,
    mintedLogId: providedLogId === undefined,
  };
}

export function resolveKs256SignerAddress(
  args: LooseParsedArgs,
): Address | undefined {
  const raw = readEvaluatedStringOption(
    args as Record<string, unknown>,
    "bootstrap-ks256-signer",
  );
  const env = process.env.KS256_SIGNER?.trim();
  const value = raw?.trim() || env;
  if (!value) {
    return undefined;
  }
  return getAddress(value);
}

export function resolveUpgradeAdminForUups(
  args: LooseParsedArgs,
  bootstrapAlg: BootstrapAlg,
): Address {
  const raw = readEvaluatedStringOption(
    args as Record<string, unknown>,
    "upgrade-admin",
  );
  const env = process.env.UPGRADE_ADMIN?.trim();
  const explicit = raw?.trim() || env;

  if (bootstrapAlg === "es256") {
    if (!explicit) {
      throw new Error(
        "--upgrade-admin (or UPGRADE_ADMIN) is required for ES256 bootstrap",
      );
    }
    return getAddress(explicit);
  }

  if (explicit) {
    return getAddress(explicit);
  }

  const ks256Signer = resolveKs256SignerAddress(args);
  if (!ks256Signer) {
    throw new Error(
      "KS256 deploy requires --bootstrap-ks256-signer (or KS256_SIGNER) " +
        "when --upgrade-admin is omitted",
    );
  }
  return ks256Signer;
}

/** Warn when upgradeAdmin equals deployer or is a plain EOA in production. */
export function warnUpgradeAdminGuardrails(
  out: Out,
  deployer: Address,
  upgradeAdmin: Address,
): void {
  if (upgradeAdmin.toLowerCase() === deployer.toLowerCase()) {
    out.warn(
      "upgradeAdmin equals deployer — deployer must not control upgrades",
    );
  }
  const prod =
    process.env.NODE_ENV === "production" ||
    process.env.DEPLOY_ENV === "production" ||
    process.env.DEPLOY_ENV === "prod";
  if (prod) {
    out.warn(
      "production deploy: prefer an owner-controlled Safe/timelock for " +
        "upgradeAdmin instead of a plain EOA",
    );
  }
}
