# TC-12-empty-Config-C — Summary

**Spec**: [tc-12-empty-Config-C.md](../test-cases/tc-12-empty-Config-C.md)
**Current status**: FAIL — last run 2026-04-09 (BRT, Chromium)
**Bug surface**: FORM-BUG-6 (RangeError variant)

## Run History

| Run | Date       | TZ  | Outcome | File                                           |
| --- | ---------- | --- | ------- | ---------------------------------------------- |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-12-empty-Config-C-run-1.md) |
| 2   | 2026-04-09 | BRT | FAIL    | [run-2](../runs/tc-12-empty-Config-C-run-2.md) |

## Current Interpretation

Run 2 (2026-04-09, Chromium): FAIL. Cross-browser verification in progress.

## Next Action

No further action — Bug #6 scope fully characterized. Fix must guard against empty value before both `new Date().toISOString()` (Config C path) and `moment().format()` (Config D path).
