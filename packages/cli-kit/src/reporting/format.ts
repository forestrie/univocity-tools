import { format } from "node:util";

/** Format a message; uses `util.format` when extra args are present. */
export function formatMessage(first: string, ...rest: unknown[]): string {
  if (rest.length === 0) {
    return first;
  }
  return format(first, ...rest);
}
