# TC-9-D-BRT-3 — Summary

**Spec**: [tc-9-D-BRT-3.md](../test-cases/tc-9-D-BRT-3.md)
**Current status**: FAIL — last run 2026-04-03 (BRT, Chromium)
**Bug surface**: Bug #5 — fake Z on GFV causes -3h/trip drift, -9h after 3 trips

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-03 | BRT | FAIL    | [run-1](../runs/tc-9-D-BRT-3-run-1.md) |

## Current Interpretation

3-trip intermediate confirms linear -3h/trip drift from Bug #5. After 3 round trips the accumulated -9h crosses midnight backward, shifting the date from Mar 15 to Mar 14 15:00. This validates the drift-per-trip model and shows that even moderate trip counts at BRT (-3h) produce date-breaking corruption.

## Next Action

No further action — drift characterized.
