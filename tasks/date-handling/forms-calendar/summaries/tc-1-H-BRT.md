# TC-1-H-BRT — Summary

**Spec**: [tc-1-H-BRT.md](../test-cases/tc-1-H-BRT.md)
**Current status**: FAIL-1 — last run 2026-04-06 (BRT, Playwright audit)
**Bug surface**: Legacy format — useLegacy=true popup stores UTC datetime; ignoreTZ=true + enableTime=true both inert on legacy path

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-H-BRT-run-1.md) |
| 2   | 2026-04-06 | BRT | FAIL-1  | [run-2](../runs/tc-1-H-BRT-run-2.md) |

## Current Interpretation

Config H (DateTime, ignoreTZ=true, useLegacy=true) in BRT stores `"2026-03-15T03:00:00.000Z"` — identical to Configs E, F, G. This completes the BRT legacy popup matrix: all four legacy configs (E/F/G/H) produce the same full UTC datetime storage format regardless of `enableTime` and `ignoreTimezone` flag combinations. Neither flag has any effect on the legacy popup storage path. Critically, Bug #5 (fake-Z in GetFieldValue) is NOT active for `useLegacy=true` fields — GetFieldValue returns the real Z value unchanged, so round-trip is stable for BRT. The FAIL-1 is purely a format failure (UTC datetime vs expected date-only string for configs where `enableTime=false` was expected to produce date-only).

## Next Action

Bug #2 audit complete. Run-2 (Playwright automated, 2026-04-06) confirms run-1 (manual, 2026-03-31). Dual-method verification achieved.
