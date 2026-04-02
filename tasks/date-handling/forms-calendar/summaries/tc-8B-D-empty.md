# TC-8B-D-empty — Summary

**Spec**: [tc-8B-D-empty.md](../test-cases/tc-8B-D-empty.md)
**Current status**: PASS — last run 2026-04-01 (BRT)
**Bug surface**: none — GDOC handles empty fields safely (returns undefined)

## Run History

| Run | Date       | TZ  | Outcome | File                                    |
| --- | ---------- | --- | ------- | --------------------------------------- |
| 1   | 2026-04-01 | BRT | PASS    | [run-1](../runs/tc-8B-D-empty-run-1.md) |

## Current Interpretation

GetDateObjectFromCalendar returns `undefined` for empty Config D fields — a falsy value safe for developer guards. This contrasts with GetFieldValue on the same empty Config D field, which returns the truthy string `"Invalid Date"` (Bug #6). GDOC's empty-value guard fires before any date parsing logic, making it immune to Bug #6. Developers needing to check if a DateTime+ignoreTZ field has a value should prefer GDOC over GFV for correct truthiness.

## Next Action

No further action for this TC — closed PASS. GDOC empty-field behavior is expected to be config-invariant (undefined for all configs). Test other config empties only if contradictory evidence appears.
