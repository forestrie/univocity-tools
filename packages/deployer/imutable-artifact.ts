import type { FoundryExecContext } from "@univocity-tools/foundry-exec/require-bins";
import { runForge } from "@univocity-tools/foundry-exec/spawn";
import path from "node:path";
import type { Hex } from "viem";

export const IMUTABLE_ARTIFACT_REL =
  "ImutableUnivocity.sol/ImutableUnivocity.json";

export type ImutableArtifact = {
  bytecode: Hex;
};

/** Absolute path to the ImutableUnivocity artifact under the forge out dir. */
export function imutableArtifactPath(outDir: string): string {
  return path.join(outDir, IMUTABLE_ARTIFACT_REL);
}

/** Extract `.bytecode.object` (creation code) from a forge artifact. */
export function parseImutableBytecodeFromArtifact(
  json: unknown,
): ImutableArtifact {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("ImutableUnivocity artifact must be a JSON object");
  }
  const record = json as Record<string, unknown>;
  const bytecodeObj = record.bytecode;
  if (
    bytecodeObj === null ||
    typeof bytecodeObj !== "object" ||
    Array.isArray(bytecodeObj)
  ) {
    throw new Error("ImutableUnivocity artifact missing bytecode object");
  }
  const object = (bytecodeObj as Record<string, unknown>).object;
  if (typeof object !== "string" || !object.startsWith("0x")) {
    throw new Error("ImutableUnivocity artifact missing bytecode.object hex");
  }
  return { bytecode: object as Hex };
}

export async function readImutableBytecode(
  artifactPath: string,
): Promise<ImutableArtifact> {
  const raw = await Bun.file(artifactPath).text();
  return parseImutableBytecodeFromArtifact(JSON.parse(raw));
}

/** `forge build` then read the ImutableUnivocity creation bytecode. */
export async function buildImutableArtifact(
  ctx: FoundryExecContext,
  forgeConfigPath: string,
  outDir: string,
): Promise<ImutableArtifact> {
  await runForge(ctx, ["build", "--config-path", forgeConfigPath]);
  return readImutableBytecode(imutableArtifactPath(outDir));
}
