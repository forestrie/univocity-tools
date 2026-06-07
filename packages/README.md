# Shared packages

Add a package under `packages/` when **two or more tools** in `apps/`
need the same types, validation, or client logic.

Do not create a package for code used by a single tool — keep it in that
app until a second consumer exists.

Likely first candidate: `@univocity-tools/safe-batch` (Safe batch JSON
types and validation ported from
[univocity/scripts/safe_propose_common.py](https://github.com/forestrie/univocity/blob/main/scripts/safe_propose_common.py)).
