import { evaluateOptionValue } from "@univocity-tools/cli-kit";
import {
  DEFAULT_CAST_BIN,
  DEFAULT_FORGE_BIN,
  resolveExecutableBin,
} from "./resolve-bin.js";

export type FoundryBinOptions = {
  forgeBin: string | false;
  castBin: string | false;
};

export type FoundryBinArgSlice = {
  forgeBin?: string | undefined;
  "forge-bin"?: string | undefined;
  castBin?: string | undefined;
  "cast-bin"?: string | undefined;
};

export function parseFoundryBinOptions(
  args: FoundryBinArgSlice,
  cwd: string = process.cwd(),
): FoundryBinOptions {
  return {
    forgeBin: resolveExecutableBin(
      evaluateOptionValue("forge-bin", args.forgeBin ?? args["forge-bin"]),
      DEFAULT_FORGE_BIN,
      cwd,
    ),
    castBin: resolveExecutableBin(
      evaluateOptionValue("cast-bin", args.castBin ?? args["cast-bin"]),
      DEFAULT_CAST_BIN,
      cwd,
    ),
  };
}
