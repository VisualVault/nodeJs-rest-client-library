# TC-7-D-isoZ-IST — Summary

**Spec**: [tc-7-D-isoZ-IST.md](../test-cases/tc-7-D-isoZ-IST.md)
**Current status**: FAIL — last run 2026-04-01 (IST)
**Bug surface**: ISO+Z input shifted by TZ offset on Config D — related to Bug #5 fake Z / getSaveValue local extraction

## Run History

| Run | Date       | TZ  | Outcome | File                                      |
| --- | ---------- | --- | ------- | ----------------------------------------- |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-7-D-isoZ-IST-run-1.md) |

## Current Interpretation

Passing an ISO string with Z suffix (`"2026-03-15T00:00:00.000Z"`) to SetFieldValue on Config D in IST stores `"2026-03-15T05:30:00"` — the UTC midnight value shifted by +5:30h (the IST offset). The root cause: `normalizeCalValue()` parses the Z-suffixed string via `new Date()` which correctly creates a UTC midnight Date object, but `getSaveValue()` extracts local time components (IST), producing 05:30 AM. The Z suffix is the trigger — it makes the parser treat the input as UTC, while the storage layer always writes local time. This is the input-side counterpart to Bug #5's output-side fake Z. Developers must avoid ISO+Z strings for Config D SetFieldValue calls.

## Next Action

No further ISO+Z input testing needed for Config D. The behavior is deterministic: shift = TZ offset. Document in developer guidance as a known unsafe input format.
