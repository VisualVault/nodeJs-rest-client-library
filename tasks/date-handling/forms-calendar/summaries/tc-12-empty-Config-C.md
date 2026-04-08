# TC-12-empty-Config-C — Summary

**Spec**: [tc-12-empty-Config-C.md](../test-cases/tc-12-empty-Config-C.md)
**Current status**: FAIL — last run 2026-04-08 (BRT)
**Bug surface**: FORM-BUG-6 (RangeError variant)

## Run History

| Run | Date       | TZ  | Outcome | File                                           |
| --- | ---------- | --- | ------- | ---------------------------------------------- |
| 1   | 2026-04-08 | BRT | FAIL    | [run-1](../runs/tc-12-empty-Config-C-run-1.md) |

## Current Interpretation

Bug #6 confirmed for Config C with a different failure mode than Config D. Config C throws `RangeError: Invalid time value` (via `new Date("").toISOString()`), while Config D returns truthy `"Invalid Date"` string (via `moment("").format()`). Config C variant is arguably more severe — it's an unhandled exception that crashes calling code, whereas Config D silently returns corrupt data. Bug #6 scope now fully mapped: C (throws), D (truthy string), A/B/E/F/G/H (immune).

## Next Action

No further action — Bug #6 scope fully characterized. Fix must guard against empty value before both `new Date().toISOString()` (Config C path) and `moment().format()` (Config D path).
