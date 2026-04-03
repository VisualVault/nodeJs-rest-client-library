# TC-7-D-dateObj-IST — Summary

**Spec**: [tc-7-D-dateObj-IST.md](../test-cases/tc-7-D-dateObj-IST.md)
**Current status**: FAIL — last run 2026-04-03 (IST, Firefox)
**Bug surface**: none — Date object input safe for Config D DateTime

## Run History

| Run | Date       | TZ  | Outcome | File                                         |
| --- | ---------- | --- | ------- | -------------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-7-D-dateObj-IST-run-1.md) |
| 2   | 2026-04-03 | IST | FAIL    | [run-2](../runs/tc-7-D-dateObj-IST-run-2.md) |

## Current Interpretation

Run 2 (2026-04-03, Firefox): FAIL. Cross-browser verification in progress.

## Next Action

No further Date object input testing needed for Config D. Input format characterization complete with Date object (safe), ISO-no-Z (safe), and ISO+Z (unsafe).
