# TC-6-D-BRT — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-6-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-6-D-BRT.md) | **Summary**: [summary](../summaries/tc-6-D-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                      |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 17:10:08 GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                       |
| Field lookup | `getValueObjectValue('DataField18')` non-empty              | Date object `"2026-04-03T20:10:00.467Z"` — auto-populated ✓                 |

## Step Results

| Step # | Expected                                     | Actual                                            | Match    |
| ------ | -------------------------------------------- | ------------------------------------------------- | -------- |
| 2      | Display today with time                      | `04/03/2026` (rawLocal)                           | PASS     |
| 3      | UTC ISO string — Date object                 | `"2026-04-03T20:10:00.467Z"` (Date object)        | PASS     |
| 4      | GFV = raw ISO (`"2026-04-03T20:10:00.467Z"`) | `"2026-04-03T17:10:00.467Z"` (string, **fake Z**) | **FAIL** |

## Outcome

**FAIL-3** — Bug #5 confirmed on Current Date at form load in BRT. Raw Date is correct (`T20:10 UTC`), but GFV returns BRT local time with fake Z (`T17:10Z`, -3h shift). Same behavior as 5-D-BRT (preset) and 6-D-IST (current date +5:30h).

## Findings

- **Bug #5 fires on Current Date AND Preset Date for Config D**: The init path (`new Date()`) is correct — the corruption is purely in the GFV output layer (`getCalendarFieldValue()`)
- **BRT shift is -3h** (vs IST +5:30h): Raw `T20:10:00.467Z` → GFV `T17:10:00.467Z`. The `17:10` is BRT local time, not UTC. The trailing Z is fake
- **Round-trip drift would be -3h per cycle**: `SetFieldValue(GetFieldValue())` would shift the stored time by -3h each trip. After 8 cycles, a full day is lost
- **Bug #5 scope now fully proven across all init paths**: User input (Cat 1, 2, 7, 8, 9), preset (5-D), and current date (6-D) all produce fake Z corruption for Config D. The bug is in the output layer, independent of how the value was originally stored
- **Config C comparison**: Same DateTime Current Date, but `ignoreTimezone=false` → GFV uses `new Date(value).toISOString()` → correct. The bug is gated by `ignoreTimezone=true`
