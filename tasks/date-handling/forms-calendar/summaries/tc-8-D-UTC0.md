# TC-8-D-UTC0 — Summary

**Spec**: [tc-8-D-UTC0.md](../test-cases/tc-8-D-UTC0.md)
**Current status**: FAIL — last run 2026-04-03 (UTC0, Chromium)
**Bug surface**: Bug #5 — fake Z coincidentally correct at UTC+0

## Run History

| Run | Date       | TZ   | Outcome | File                                  |
| --- | ---------- | ---- | ------- | ------------------------------------- |
| 1   | 2026-04-03 | UTC0 | FAIL    | [run-1](../runs/tc-8-D-UTC0-run-1.md) |

## Current Interpretation

Bug #5 is structurally present at UTC+0 — `getCalendarFieldValue()` adds fake Z via `moment().format("...[Z]")`. At UTC+0, fake Z is numerically identical to real UTC, making the bug invisible in round-trip drift. This is why Bug #5 may go undetected in UTC+0 testing environments. Completes Config D 3-TZ spectrum (BRT -3h drift, IST +5:30h drift, UTC0 0h drift).

## Next Action

No further action — Bug #5 characterized across all 3 TZs.
