# TC-9-D-BRT-8 — Summary

**Spec**: [tc-9-D-BRT-8.md](../test-cases/tc-9-D-BRT-8.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: Bug #5 (fake Z in GetFieldValue), Bug #5 consequence (−3h drift per round-trip in BRT, full day lost after 8 trips)

## Run History

| Run | Date       | TZ  | Outcome | File                                   |
| --- | ---------- | --- | ------- | -------------------------------------- |
| 1   | 2026-03-27 | BRT | FAIL-1  | [run-1](../runs/tc-9-D-BRT-8-run-1.md) |
| 2   | 2026-04-03 | BRT | FAIL    | [run-2](../runs/tc-9-D-BRT-8-run-2.md) |
| 3   | 2026-04-09 | BRT | FAIL    | [run-3](../runs/tc-9-D-BRT-8-run-3.md) |

## Current Interpretation

Run 3 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No fix available until Bug #5 is patched in `getCalendarFieldValue()`. This data confirms that production scripts looping over Config D fields (e.g., copy-field scripts, workflow automation) will silently corrupt dates. Document as high-severity blocker. Track companion test 9-D-BRT-10 for the 10-trip milestone confirmation.
