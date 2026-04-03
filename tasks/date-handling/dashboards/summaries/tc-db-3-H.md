# TC-DB-3-H — Summary

**Spec**: [tc-db-3-H.md](../test-cases/tc-db-3-H.md)
**Current status**: PASS — last run 2026-04-02
**Bug surface**: Legacy popup UTC storage confirmed — ignoreTZ inert on legacy path

## Run History

| Run | Date       | Outcome | File                                |
| --- | ---------- | ------- | ----------------------------------- |
| 1   | 2026-04-02 | PASS    | [run-1](../runs/tc-db-3-H-run-1.md) |

## Current Interpretation

Config H (ignoreTZ=true) shows byte-identical behavior to Config G. The `ignoreTZ` flag is irrelevant on the legacy popup path. Completes DB-3: all 8 configs confirm that write-layer bugs propagate to the dashboard unchanged — the dashboard is a transparent window into database state.

## Next Action

No re-run needed. DB-3 category complete.
