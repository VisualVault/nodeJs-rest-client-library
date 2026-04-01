# TC-8-C-empty — Summary

**Spec**: [tc-8-C-empty.md](../test-cases/tc-8-C-empty.md)
**Current status**: FAIL-1 — last run 2026-04-01 (BRT)
**Bug surface**: Bug #6 variant — GetFieldValue throws RangeError for empty Config C fields

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-04-01 | BRT | FAIL-1  | [run-1](../runs/tc-8-C-empty-run-1.md) |

## Current Interpretation

GetFieldValue on empty Config C (`enableTime=true, ignoreTimezone=false, useLegacy=false`) **throws `RangeError: Invalid time value`** — worse than Bug #6 (Config D returns `"Invalid Date"` string). Both share the root cause: no empty-value guard in `getCalendarFieldValue()` before date transformation. Config C takes `new Date("").toISOString()` (throws), Config D takes `moment("").format(...)` (returns string). This expands Bug #6 scope: all `enableTime=true && !useLegacy` configs fail on empty fields, not just Config D.

## Next Action

Update Bug #6 analysis to include Config C throw variant. Run 8-H-empty to confirm useLegacy=true prevents both variants.
