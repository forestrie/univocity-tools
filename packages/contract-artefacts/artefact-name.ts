const TAR_GZ_SUFFIX = ".tar.gz";

/** Strip .tar.gz and an optional trailing -vX.Y.Z(+buildid) suffix. */
const VERSION_SUFFIX_PATTERN = /-v?\d+\.\d+\.\d+(?:\+\S+)?$/;

/** Derive the artefact base name from a tarball file name. */
export function deriveArtefactBaseName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed.endsWith(TAR_GZ_SUFFIX)) {
    return trimmed;
  }
  const withoutSuffix = trimmed.slice(0, -TAR_GZ_SUFFIX.length);
  return withoutSuffix.replace(VERSION_SUFFIX_PATTERN, "");
}

/** True for GitHub "Source code" archives and non-tarball names. */
export function isIgnoredArtefact(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed.endsWith(TAR_GZ_SUFFIX)) {
    return true;
  }
  if (trimmed.startsWith("Source code")) {
    return true;
  }
  return false;
}

function matchesSelector(fileName: string, selector: string): boolean {
  if (fileName === selector) {
    return true;
  }
  return deriveArtefactBaseName(fileName) === selector;
}

/** Select artefact file names; empty selector returns all non-ignored names. */
export function selectArtefacts(
  fileNames: string[],
  selector: string | undefined,
): string[] {
  const candidates = fileNames.filter((name) => !isIgnoredArtefact(name));
  const trimmed = selector?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    if (candidates.length === 0) {
      throw new Error("no fetchable artefacts found");
    }
    return candidates;
  }

  const matches = candidates.filter((name) => matchesSelector(name, trimmed));
  if (matches.length === 0) {
    throw new Error(`artefact "${trimmed}" not found`);
  }
  return matches;
}
