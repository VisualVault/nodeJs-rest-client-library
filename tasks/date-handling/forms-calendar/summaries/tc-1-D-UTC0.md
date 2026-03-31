# TC-1-D-UTC0 — Summary

**Spec**: [tc-1-D-UTC0.md](../test-cases/tc-1-D-UTC0.md)
**Current status**: PASS — last run 2026-03-31 (UTC+0)
**Bug surface**: Bug #5 present in code but zero-drift at UTC+0 (fake Z coincidentally correct)

## Run History

| Run | Date       | TZ    | Outcome | File                                  |
| --- | ---------- | ----- | ------- | ------------------------------------- |
| 1   | 2026-03-31 | UTC+0 | PASS    | [run-1](../runs/tc-1-D-UTC0-run-1.md) |

## Current Interpretation

Config D (DateTime, ignoreTZ=true, modern path) at UTC+0 passes because the fake Z appended by Bug #5 happens to equal the real UTC value: at UTC+0, local midnight IS UTC midnight, so `"2026-03-15T00:00:00.000Z"` (fake Z) equals `"2026-03-15T00:00:00.000Z"` (real UTC). The bug is active in the code — the `getCalendarFieldValue()` fake-Z path executes — but produces a coincidentally correct result. Round-trip is stable for the same reason. This is the zero-drift control for Bug #5 drift tests, completing the three-timezone picture: BRT FAIL-2 (-3h per trip), IST FAIL-2 (+5:30h per trip), UTC+0 PASS (zero drift). A UTC+0 tester would never observe Bug #5 drift and might incorrectly conclude the feature is working correctly.

## Next Action

No re-run needed. UTC+0 control role is fulfilled. The PASS outcome must be interpreted carefully — it does not indicate absence of Bug #5 in the codebase.
