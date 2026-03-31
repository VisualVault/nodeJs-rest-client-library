# TC-2-B-IST — Summary

**Spec**: [tc-2-B-IST.md](../test-cases/tc-2-B-IST.md)
**Current status**: FAIL-1 — last run 2026-03-31 (IST)
**Bug surface**: Bug #7 (-1 day shift for date-only typed input in UTC+ timezones); `ignoreTimezone=true` has no mitigating effect

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-03-31 | IST | FAIL-1  | [run-1](../runs/tc-2-B-IST-run-1.md) |

## Current Interpretation

Config B (`enableTime=false`, `ignoreTimezone=true`, `useLegacy=false`) typed input in IST stores `"2026-03-14"` — identical to Config A (2-A-IST). The `ignoreTimezone` flag does not alter the date-only save path in V1: both configs route through the same `normalizeCalValue()` → `getSaveValue()` sequence. The -1 day shift in IST is caused by Bug #7 regardless of the `ignoreTimezone` setting. `GetFieldValue` returns the raw value unchanged (outside Bug #5 surface). Result matches the sibling popup test (1-B-IST), confirming Bug #2 absent. The finding establishes that `ignoreTimezone=true` provides no protection against Bug #7 for date-only fields in UTC+ timezones.

## Next Action

No further IST runs needed for this slot. Bug #7 confirmed across Config A and Config B in IST via both popup and typed input paths. Proceed to 2-C-IST and 2-D-IST (DateTime typed input in IST) to determine whether the -1 day or same-day behavior applies to DateTime fields.
