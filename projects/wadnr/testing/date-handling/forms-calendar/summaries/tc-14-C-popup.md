# TC-14-C-popup — Summary

**Spec**: [tc-14-C-popup.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-C-popup.md)
**Current status**: PASS — last run 2026-04-13 (BRT)
**Bug surface**: none — Kendo v2 popup stores local midnight correctly

## Run History

| Run | Date       | TZ  | Outcome | File                                     |
| --- | ---------- | --- | ------- | ---------------------------------------- |
| 1   | 2026-04-13 | BRT | PASS    | [run-1](../runs/tc-14-C-popup-run-1.md) |

## Current Interpretation

Kendo v2 popup stores `"2026-03-15T00:00:00"` (local midnight), NOT `"2026-03-15T03:00:00"` (UTC-equivalent) as the matrix predicted for Kendo v1. This is actually more correct — local time stored consistently. Matrix prediction corrected. API converts correctly to `"2026-03-15T03:00:00.000Z"`.

Key Phase C question: when mask is `MM/dd/yyyy`, does the popup still show the Time tab? If not, what time value gets stored?

## Next Action

Run Phase C after mask addition. Also run on EmanuelJofre (Kendo v1) to confirm the v1 vs v2 popup storage difference.
