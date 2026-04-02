# TC-7-D-dateObj-IST — Summary

**Spec**: [tc-7-D-dateObj-IST.md](../test-cases/tc-7-D-dateObj-IST.md)
**Current status**: PASS — last run 2026-04-01 (IST)
**Bug surface**: none — Date object input safe for Config D DateTime

## Run History

| Run | Date       | TZ  | Outcome | File                                         |
| --- | ---------- | --- | ------- | -------------------------------------------- |
| 1   | 2026-04-01 | IST | PASS    | [run-1](../runs/tc-7-D-dateObj-IST-run-1.md) |

## Current Interpretation

Passing a JavaScript Date object (`new Date(2026,2,15)`) to SetFieldValue on Config D in IST stores `"2026-03-15T00:00:00"` — the correct local midnight. No double-shift occurs because `normalizeCalValue()` receives a Date object directly and `getSaveValue()` extracts local time components. The GFV return includes the fake Z (Bug #5), but the stored value itself is correct. Date objects are a safe input format for Config D DateTime fields across timezones.

## Next Action

No further Date object input testing needed for Config D. Input format characterization complete with Date object (safe), ISO-no-Z (safe), and ISO+Z (unsafe).
