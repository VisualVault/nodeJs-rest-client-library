# TC-3-C-BRT-BRT — Summary

**Spec**: [tc-3-C-BRT-BRT.md](../test-cases/tc-3-C-BRT-BRT.md)
**Current status**: PASS — last run 2026-03-31 (BRT)
**Bug surface**: none — control/passing scenario

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-03-27 | BRT | PASS    | [run-1](../runs/tc-3-C-BRT-BRT-run-1.md) |
| 2   | 2026-03-31 | BRT | PASS    | [run-2](../runs/tc-3-C-BRT-BRT-run-2.md) |
| 3   | 2026-03-31 | BRT | PASS    | [run-3](../runs/tc-3-C-BRT-BRT-run-3.md) |

## Current Interpretation

Config C (`enableTime=true`, `ignoreTimezone=false`, `useLegacy=false`) passes consistently across three runs. Run 3 (2026-03-31) performed a full save-then-reload cycle on a fresh form (DateTest-000079, current template). Pre-save and post-reload values are identical: raw `"2026-03-15T00:00:00"`, GFV `"2026-03-15T03:00:00.000Z"` (correct UTC conversion). Save does not corrupt Config C DateTime values. Current template produces same results as DateTest-000004.

## Next Action

Run 3-C-BRT-IST to verify cross-TZ reload behavior.
