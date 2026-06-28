import path from "node:path";
import { readFactoryBytecode } from "./read-factory-bytecode.js";

const UUPS_IMPL_REL = "UUPSUnivocity.sol/UUPSUnivocity.json";
const ERC1967_PROXY_REL = "ERC1967Proxy.sol/ERC1967Proxy.json";

function findInitializeAbi(abi: unknown): readonly unknown[] {
  if (!Array.isArray(abi)) {
    throw new Error("UUPSUnivocity artifact missing abi array");
  }
  const initialize = abi.filter(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      (item as { type?: string }).type === "function" &&
      (item as { name?: string }).name === "initialize",
  );
  if (initialize.length === 0) {
    throw new Error("UUPSUnivocity artifact missing initialize ABI");
  }
  return initialize;
}

/** Load UUPS + ERC1967Proxy artifacts from an extracted univocity release root. */
export async function readUupsArtifactsFromReleaseRoot(
  releaseRoot: string,
): Promise<{
  uupsImplBytecode: `0x${string}`;
  erc1967ProxyBytecode: `0x${string}`;
  initializeAbi: readonly unknown[];
}> {
  const uupsPath = path.join(releaseRoot, "out", UUPS_IMPL_REL);
  const proxyPath = path.join(releaseRoot, "out", ERC1967_PROXY_REL);
  const uupsRaw = JSON.parse(await Bun.file(uupsPath).text()) as {
    abi?: unknown;
    bytecode?: { object?: string };
  };
  const proxyArtifact = await readFactoryBytecode(proxyPath);
  const uupsBytecode = uupsRaw.bytecode?.object;
  if (typeof uupsBytecode !== "string" || !uupsBytecode.startsWith("0x")) {
    throw new Error(`missing UUPSUnivocity bytecode at ${uupsPath}`);
  }
  return {
    uupsImplBytecode: uupsBytecode as `0x${string}`,
    erc1967ProxyBytecode: proxyArtifact.bytecode,
    initializeAbi: findInitializeAbi(uupsRaw.abi),
  };
}
