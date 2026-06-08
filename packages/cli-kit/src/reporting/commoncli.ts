import type { ArgsDef } from "citty";

/** Shared `--verbosity` / `-v` flag for all univocity-tools CLIs. */
export const verbosityArgs = {
  verbosity: {
    type: "string",
    description:
      "Output verbosity (-1 silent stderr, 0 default, 3+ trace logging)",
    alias: ["v"],
    default: "0",
  },
} as const satisfies ArgsDef;
