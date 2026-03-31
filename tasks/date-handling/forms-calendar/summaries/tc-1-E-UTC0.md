# TC-1-E-UTC0 — Summary

**Spec**: [tc-1-E-UTC0.md](../test-cases/tc-1-E-UTC0.md)
**Current status**: FAIL-1 — last run 2026-03-31 (UTC+0)
**Bug surface**: Legacy format — stores UTC datetime instead of date-only; date component correct at UTC+0 (no shift)

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-31 | UTC+0 | FAIL-1  | [run-1](../runs/tc-1-E-UTC0-run-1.md) |

## Current Interpretation

Config E (date-only, ignoreTZ=false, useLegacy=true) at UTC+0 stores `"2026-03-15T00:00:00.000Z"` — full UTC datetime, not date-only. The legacy format bug is present but the date component is correct because UTC+0 midnight = UTC midnight (no shift). This contrasts with IST where the same legacy format stores `"2026-03-14T18:30:00.000Z"` (previous-day UTC date). UTC+0 is the boundary: the format is wrong everywhere, but the date-shift component of the bug only manifests in non-zero offsets. Matrix prediction was `"2026-03-15"` — corrected to `"2026-03-15T00:00:00.000Z"`. Sibling 1-F-UTC0 prediction also corrected.

## Next Action

Run tc-1-F-UTC0 (pending) to confirm ignoreTZ is a no-op at UTC+0 — expected `"2026-03-15T00:00:00.000Z"` (same as E-UTC0). This would complete all remaining Category 1 legacy slots.
