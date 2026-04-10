# TC-8-H-BRT — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-8-H-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8-H-BRT.md) | **Summary**: [summary](../summaries/tc-8-H-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                           | Result                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                           | `"Wed Apr 01 2026 14:16:12 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                       | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=true, enableInitialValue=false` | `["DataField13"]` ✓                                                                  |

## Step Results

| Step # | Expected                              | Actual                       | Match |
| ------ | ------------------------------------- | ---------------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"` (raw)         | `"2026-03-15T00:00:00"`      | PASS  |
| 4      | `"2026-03-15T00:00:00"` (GFV)         | `"2026-03-15T00:00:00"`      | PASS  |
| 5      | `true` (GFV === raw)                  | `true`                       | PASS  |
| 6      | `"2026-03-15T03:00:00.000Z"` (TZ ref) | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — GetFieldValue on Config H returns the raw stored value unchanged (`"2026-03-15T00:00:00"`, no fake Z). `useLegacy=true` bypasses the Bug #5 code branch as predicted.

## Findings

- Actual matches matrix prediction exactly: GFV returns raw value with no transformation
- **Bug #5 confirmed as non-legacy only**: Config H (`useLegacy=true`) is immune. The `!useLegacy` guard in `getCalendarFieldValue()` correctly prevents the fake-Z addition. This contrasts with Config D (same flags except `useLegacy=false`) which returns `"2026-03-15T00:00:00.000Z"` (Bug #5)
- **Round-trip safety**: Since GFV === raw, `SetFieldValue(GetFieldValue())` produces zero drift for Config H — unlike Config D which drifts -3h per trip in BRT
- Sibling 8-H-IST should produce the identical result (TZ-invariant — the raw value is returned as-is)
- Recommended next: run 8-H-empty to test whether `useLegacy=true` also prevents Bug #6 (Invalid Date for empty fields)
