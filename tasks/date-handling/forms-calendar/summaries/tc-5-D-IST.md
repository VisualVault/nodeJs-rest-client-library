# TC-5-D-IST — Summary

**Spec**: [tc-5-D-IST.md](../test-cases/tc-5-D-IST.md)
**Current status**: FAIL — last run 2026-04-01 (IST)
**Bug surface**: Bug #5 — fake Z on preset DateTime field at form load (+5:30h shift in IST)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-5-D-IST-run-1.md) |

## Current Interpretation

Bug #5 affects preset DateTime Config D fields at form load, not just user-input values. The preset Date object has a correct raw UTC representation (`T11:28:54.627Z`), but `getCalendarFieldValue()` applies its fake Z transformation, producing GFV = `T16:58:54.627Z` — shifted by exactly +5:30h (the IST offset). Any developer code calling `GetFieldValue()` on a preset Config D field gets a corrupted value before any user interaction occurs. The display shows the correct date, masking the corruption from users but exposing it to programmatic consumers.

## Next Action

Test 5-C-IST (DateTime without ignoreTimezone) to determine if preset DateTime fields without the `ignoreTimezone` flag avoid the fake Z path.
