# TC-5-D-BRT — Run 1 | 2026-04-03 | BRT | FAIL-3

**Spec**: [tc-5-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-5-D-BRT.md) | **Summary**: [summary](../summaries/tc-5-D-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                  | Result                                                                               |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                  | `"Fri Apr 03 2026 16:11:29 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=true, ignoreTimezone=true, useLegacy=false, enableInitialValue=true | `Field16` with initialDate `"2026-03-01T11:28:54.627Z"` ✓                            |

## Step Results

| Step # | Expected                                            | Actual                                            | Match    |
| ------ | --------------------------------------------------- | ------------------------------------------------- | -------- |
| 2      | Display: `03/01/2026 08:28 AM`                      | `03/01/2026` (rawLocal = `"3/1/2026"`)            | PASS     |
| 3      | Raw `.toISOString()` = `"2026-03-01T11:28:54.627Z"` | `"2026-03-01T11:28:54.627Z"` (Date object)        | PASS     |
| 4      | GFV = `"2026-03-01T08:28:54.627"` (no fake Z)       | `"2026-03-01T08:28:54.627Z"` (string, **fake Z**) | **FAIL** |
| 5      | isoRef = `"2026-03-01T03:00:00.000Z"`               | `"2026-03-01T03:00:00.000Z"`                      | PASS     |

## Outcome

**FAIL-3** — Bug #5 confirmed: GFV adds fake Z suffix to BRT local time representation. Raw Date is correct (`"2026-03-01T11:28:54.627Z"` = UTC 11:28), but GFV returns `"2026-03-01T08:28:54.627Z"` where `08:28:54.627` is BRT local time (UTC-3) with a deceptive Z appended.

## Findings

- **Bug #5 confirmed in BRT for preset DateTime at form load.** `getCalendarFieldValue()` converts Date to local time via `moment(value)` → BRT 08:28 → then appends fake Z via format string `"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]"`.
- The shift is -3h (BRT offset): raw UTC 11:28 → GFV claims "08:28Z". A consumer treating Z as UTC would interpret the event 3 hours earlier than reality.
- Raw Date object is correct — it preserves the `initialDate` exactly (`"2026-03-01T11:28:54.627Z"`). The corruption is purely in the GFV output layer.
- DateTime presets bypass `parseDateString` — raw value is `new Date(initialDate)` with no truncation. Consistent with tc-5-C-BRT finding.
- On round-trip (`SetFieldValue(GetFieldValue())`), each cycle would shift by -3h. After 8 cycles the date shifts back a full day.
- Compare with 5-D-IST where the shift is +5:30h (IST → fake Z adds 5:30h instead of subtracting 3h). The direction matches the TZ offset sign.
