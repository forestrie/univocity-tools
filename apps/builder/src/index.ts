import pkg from "../package.json";

export const NAME = "builder";
export const DESCRIPTION =
  "CLI for Univocity contract build and deploy artifacts";
export const VERSION: string = pkg.version;

export function printHelp(): void {
  console.log(`${NAME} — ${DESCRIPTION}

Usage:
  builder [options]

Options:
  -h, --help       Show this help
  -v, --version    Show version

Commands coming soon.
`);
}

export function printVersion(): void {
  console.log(VERSION);
}

export function run(argv: string[]): number {
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      printHelp();
      return 0;
    }
    if (arg === "-v" || arg === "--version") {
      printVersion();
      return 0;
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}`);
      console.error("Try 'builder --help' for usage.");
      return 1;
    }
    console.error(`Unknown argument: ${arg}`);
    console.error("Try 'builder --help' for usage.");
    return 1;
  }

  printHelp();
  return 0;
}
