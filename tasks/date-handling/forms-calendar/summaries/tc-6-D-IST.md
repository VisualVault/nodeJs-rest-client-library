# TC-6-D-IST — Summary

**Spec**: [tc-6-D-IST.md](../test-cases/tc-6-D-IST.md)
**Current status**: FAIL — last run 2026-04-01 (IST)
**Bug surface**: Bug #5 — fake Z on current date DateTime field at form load (+5:30h shift in IST)

## Run History

| Run | Date       | TZ  | Outcome | File                                 |
| --- | ---------- | --- | ------- | ------------------------------------ |
| 1   | 2026-04-01 | IST | FAIL    | [run-1](../runs/tc-6-D-IST-run-1.md) |

## Current Interpretation

Bug #5 fires on the current date auto-populated Config D field at form load, producing a +5:30h shift in IST. The raw Date object is correct (`T00:39:22.750Z`), but `getCalendarFieldValue()` applies the fake Z transformation to produce `T06:09:22.750Z`. This matches the 5-D-IST (preset) result exactly in mechanism — Bug #5 affects all value origins (user input, preset, current date) for Config D DateTime fields. The display shows the correct IST date, masking the corruption from users.

## Next Action

Test 6-C-IST (current date DateTime without ignoreTimezone) to determine if the `ignoreTimezone=false` path avoids the fake Z.
