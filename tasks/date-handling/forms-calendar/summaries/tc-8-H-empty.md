# TC-8-H-empty — Summary

**Spec**: [tc-8-H-empty.md](../test-cases/tc-8-H-empty.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — control test confirming Bug #6 is absent for useLegacy=true

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-8-H-empty-run-1.md) |

## Current Interpretation

Config H (`useLegacy=true`, `enableTime=true`, `ignoreTimezone=true`) returns `""` for empty fields — `useLegacy=true` bypasses the `getCalendarFieldValue()` transformation block entirely, preventing both Bug #6 (`"Invalid Date"` string from Config D) and the RangeError throw from Config C. This fully bounds Bug #6 scope: only `enableTime=true && !useLegacy` configs (C and D) are affected. All legacy configs and date-only configs are immune.

## Next Action

No further action for this TC — closed PASS. Bug #6 scope fully characterized across configs A (safe), B (safe, predicted), C (throws), D ("Invalid Date"), H (safe). Only E/F/G-empty remain untested but are predicted safe (date-only or legacy).
