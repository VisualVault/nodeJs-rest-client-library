# TC-DB-3-C — Summary

**Spec**: [tc-db-3-C.md](../test-cases/tc-db-3-C.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Bug #7 variant confirmed — DateTime field shifted to wrong day via date-only string input

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-C-run-1.md) |

## Current Interpretation

When a DateTime field (Config C) receives a date-only string via `SetFieldValue`, the same Bug #7 `normalizeCalValue()` mechanism fires. Dashboard shows `3/14/2026 12:00 AM` — midnight of the wrong day. This variant was observed in exploratory data (DateTest-001055).

## Next Action

No re-run needed. Bug #7 variant propagation confirmed for Config C.
