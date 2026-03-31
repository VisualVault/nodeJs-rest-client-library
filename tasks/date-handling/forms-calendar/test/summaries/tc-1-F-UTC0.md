# TC-1-F-UTC0 — Summary

**Spec**: [tc-1-F-UTC0.md](../tc-1-F-UTC0.md)
**Current status**: FAIL-1 — last run 2026-03-31 (UTC+0)
**Bug surface**: Legacy format — stores UTC datetime instead of date-only; ignoreTZ no-op confirmed; date correct at UTC+0

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-31 | UTC+0 | FAIL-1  | [run-1](../runs/tc-1-F-UTC0-run-1.md) |

## Current Interpretation

Config F (date-only, ignoreTZ=true, useLegacy=true) at UTC+0 stores `"2026-03-15T00:00:00.000Z"` — identical to Config E (tc-1-E-UTC0). The `ignoreTimezone=true` flag has no effect on legacy popup storage, consistent with all prior findings across BRT and IST. This is the final Category 1 test — all 20 calendar popup slots are now complete. The legacy format bug (raw `toISOString()` storage) is confirmed universal across all configs and timezones.

## Next Action

No further action for Category 1. All 20 slots complete (8 PASS, 12 FAIL). Next priority: Category 2 legacy tests or remaining non-legacy categories.
