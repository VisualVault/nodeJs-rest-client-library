# TC-5-B-BRT — Summary

**Spec**: [tc-5-B-BRT.md](../test-cases/tc-5-B-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — preset date stores correctly in BRT (negative offset preserves UTC date)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-5-B-BRT-run-1.md) |

## Current Interpretation

Config B preset (date-only, ignoreTZ=true) loads correctly in BRT. BRT midnight March 1 = UTC March 1 03:00 — negative offset means UTC date matches local date, so Bug #7 does not fire. Control test confirming Bug #7 is purely a UTC+ issue.

## Next Action

No further action — behavior characterized. Compare with 5-B-IST (Bug #7 FAIL) to confirm the UTC+ dependency.
