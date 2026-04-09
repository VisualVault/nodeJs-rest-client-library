# TC-1-E-BRT — Summary

**Spec**: [tc-1-E-BRT.md](../test-cases/tc-1-E-BRT.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Legacy format — useLegacy=true popup stores full UTC datetime instead of date-only string

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | BRT | FAIL-1  | [run-1](../runs/tc-1-E-BRT-run-1.md) |
| 2   | 2026-04-06 | BRT | FAIL-1  | [run-2](../runs/tc-1-E-BRT-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-1-E-BRT-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

Bug #2 audit complete. Run-2 (Playwright automated, 2026-04-06) confirms run-1 (manual, 2026-03-31) — values match exactly. Dual-method verification achieved. Cross-category comparison with TC-2-E-BRT (typed: `"2026-03-15"`) confirms format divergence (Bug #2). IST case already documented in tc-1-E-IST.md.
