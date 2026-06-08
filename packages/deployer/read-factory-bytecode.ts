export type FactoryArtifact = {
  bytecode: `0x${string}`;
};

export function parseFactoryBytecodeFromArtifact(
  json: unknown,
): FactoryArtifact {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("CREATE3Factory artifact must be a JSON object");
  }

  const record = json as Record<string, unknown>;
  const bytecodeObj = record.bytecode;
  if (
    bytecodeObj === null ||
    typeof bytecodeObj !== "object" ||
    Array.isArray(bytecodeObj)
  ) {
    throw new Error("CREATE3Factory artifact missing bytecode object");
  }

  const object = (bytecodeObj as Record<string, unknown>).object;
  if (typeof object !== "string" || !object.startsWith("0x")) {
    throw new Error("CREATE3Factory artifact missing bytecode.object hex");
  }

  return { bytecode: object as `0x${string}` };
}

export async function readFactoryBytecode(
  artifactPath: string,
): Promise<FactoryArtifact> {
  const raw = await Bun.file(artifactPath).text();
  return parseFactoryBytecodeFromArtifact(JSON.parse(raw));
}
