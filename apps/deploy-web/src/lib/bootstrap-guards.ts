import type { BootstrapAlg } from "@univocity-tools/deploy-core";

/** Genesis bootstrap material must be explicitly acknowledged before deploy. */
export function bootstrapAckRequired(options: {
  bootstrapAlg: BootstrapAlg;
  es256Pem: string;
  ks256PrivateKey: string | null;
}): boolean {
  if (options.bootstrapAlg === "es256" && options.es256Pem.trim().length > 0) {
    return true;
  }
  if (options.bootstrapAlg === "ks256" && options.ks256PrivateKey !== null) {
    return true;
  }
  return false;
}
