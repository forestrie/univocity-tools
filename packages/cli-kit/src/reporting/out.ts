import { formatMessage } from "./format.js";
import type { Verbosity } from "./verbosity.js";

export type OutFn = {
  (message: string): void;
  (format: string, ...args: unknown[]): void;
};

export interface Out {
  /** stdout — generated / pipeable content only */
  out: OutFn;
  /** stderr — user feedback (verbosity >= 0) */
  print: OutFn;
  /** stderr — warnings (verbosity >= 0) */
  warn: OutFn;
  /** stderr — trace / diagnostic (verbosity > 2) */
  log: OutFn;
  readonly verbosity: Verbosity;
}

export type OutStreams = {
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
};

function writeLine(
  stream: NodeJS.WriteStream,
  first: string,
  rest: unknown[],
): void {
  stream.write(`${formatMessage(first, ...rest)}\n`);
}

function makeWriter(
  stream: NodeJS.WriteStream,
  enabled: () => boolean,
): OutFn {
  const writer = ((first: string, ...rest: unknown[]) => {
    if (!enabled()) {
      return;
    }
    writeLine(stream, first, rest);
  }) as OutFn;
  return writer;
}

export function createOut(
  verbosity: Verbosity,
  streams: OutStreams = {
    stdout: process.stdout,
    stderr: process.stderr,
  },
): Out {
  return {
    verbosity,
    out: makeWriter(streams.stdout, () => true),
    print: makeWriter(streams.stderr, () => verbosity >= 0),
    warn: makeWriter(streams.stderr, () => verbosity >= 0),
    log: makeWriter(streams.stderr, () => verbosity > 2),
  };
}

const nullStream = {
  write() {
    return true;
  },
} as unknown as NodeJS.WriteStream;

/** Suppresses all stderr channels; stdout `.out()` still works. */
export function createNullOut(verbosity: Verbosity = -1): Out {
  return createOut(verbosity, {
    stdout: process.stdout,
    stderr: nullStream,
  });
}

export type CapturedLine = {
  stream: "stdout" | "stderr";
  channel: "out" | "print" | "warn" | "log";
  text: string;
};

export type CaptureOut = Out & {
  readonly lines: CapturedLine[];
};

/** In-memory `Out` for tests. */
export function createCaptureOut(verbosity: Verbosity = 0): CaptureOut {
  const lines: CapturedLine[] = [];

  function capture(
    stream: "stdout" | "stderr",
    channel: CapturedLine["channel"],
    enabled: () => boolean,
  ): OutFn {
    return ((first: string, ...rest: unknown[]) => {
      if (!enabled()) {
        return;
      }
      lines.push({
        stream,
        channel,
        text: formatMessage(first, ...rest),
      });
    }) as OutFn;
  }

  return {
    verbosity,
    get lines() {
      return [...lines];
    },
    out: capture("stdout", "out", () => true),
    print: capture("stderr", "print", () => verbosity >= 0),
    warn: capture("stderr", "warn", () => verbosity >= 0),
    log: capture("stderr", "log", () => verbosity > 2),
  };
}
