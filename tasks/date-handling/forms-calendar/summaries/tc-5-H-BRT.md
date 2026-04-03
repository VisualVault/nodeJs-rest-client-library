# TC-5-H-BRT — Summary

**Spec**: [tc-5-H-BRT.md](../test-cases/tc-5-H-BRT.md)
**Current status**: PASS — last run 2026-04-03 (BRT)
**Bug surface**: none — legacy avoids Bug #5 (no fake Z transformation)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-03 | BRT | PASS    | [run-1](../runs/tc-5-H-BRT-run-1.md) |

## Current Interpretation

Legacy Config H preset (DateTime, ignoreTZ=true, useLegacy=true) loads correctly in BRT. This is the legacy equivalent of non-legacy Config D (which FAILS with Bug #5). `getCalendarFieldValue` returns raw value for `useLegacy=true`, bypassing the fake Z format path entirely. This makes legacy ignoreTZ DateTime presets safer than their non-legacy counterparts. Compare with 5-D-BRT (FAIL-3, Bug #5) to document the `useLegacy=true` safety advantage.

## Next Action

No further action — behavior characterized. Compare with 5-D-BRT (FAIL) to document the useLegacy=true safety advantage.
