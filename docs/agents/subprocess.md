# Subprocess conventions

All TypeScript in **`apps/`** and **`packages/`** that runs external
programs must use **`Bun.spawn`**. This repo targets Bun only; Node
`child_process` compatibility is intentionally out of scope.

## Required API

```typescript
const proc = Bun.spawn(["forge", "script", scriptName], {
  cwd: univocityRoot,
  env: process.env,
  stdin: "ignore",
  stdout: "pipe",
  stderr: "pipe",
});

const exitCode = await proc.exited;
const stderr = await new Response(proc.stderr).text();
if (exitCode !== 0) {
  throw new Error(`forge script failed (${exitCode}): ${stderr}`);
}
```

### Stdin

| Need | Option |
|------|--------|
| No input | `stdin: "ignore"` |
| One-shot string/buffer | `stdin: new Blob([input])` or `stdin: buffer` |
| Interactive / stream | `stdin: "pipe"` then `proc.stdin.write(…)` and `proc.stdin.end()` |
| User TTY | `stdin: "inherit"` |

### Stdout / stderr

| Need | Option |
|------|--------|
| Capture for parsing | `"pipe"` then read the stream |
| Live logs | `"inherit"` |
| Discard | `"ignore"` |

### Exit status

- **`await proc.exited`** — preferred; `Promise<number>`.
- Check **`exitCode !== 0`** before treating output as success.
- Propagate failure to the CLI (non-zero exit, message on stderr).

## Forbidden in apps/ and packages/

| Do not use | Reason |
|------------|--------|
| `node:child_process` | Node compatibility; use `Bun.spawn` |
| `exec`, `execSync`, `spawn` from `child_process` | Same |
| Bun **`$` …** shell helper | Implicit shell; use explicit argv via `Bun.spawn` |

## Shared wrapper

When two tools share spawn logic, add a small helper in **`packages/`**
(for example reading `UNIVOCITY_ROOT`, mapping exit codes, teeing
stderr). Keep argv arrays at the call site when behavior differs.

## Tests

Prefer spawning real binaries only in integration tests. Unit tests
should mock at the wrapper boundary or test pure functions on captured
stdout strings.
