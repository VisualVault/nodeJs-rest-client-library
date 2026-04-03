# TC-5-E-IST — Run 1 | 2026-04-03 | IST | FAIL-3

**Spec**: [tc-5-E-IST.md](../test-cases/tc-5-E-IST.md) | **Summary**: [summary](../summaries/tc-5-E-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                   | Result                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                   | `"Sat Apr 04 2026 01:20:49 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=false, ignoreTimezone=false, useLegacy=true, enableInitialValue=true | `Field19` with initialDate `"2026-03-01T11:31:09.996Z"` ✓                         |

## Step Results

| Step # | Expected                                     | Actual                                                 | Match    |
| ------ | -------------------------------------------- | ------------------------------------------------------ | -------- |
| 2      | Display: `03/01/2026`                        | `03/01/2026` (rawLocal = `"3/1/2026"`)                 | PASS     |
| 3      | Raw `.toISOString()` contains `"2026-03-01"` | `"2026-02-28T18:30:00.000Z"` (Date object, **Feb 28**) | **FAIL** |
| 4      | GFV = `"2026-03-01"`                         | Date `.toISOString()` = `"2026-02-28T18:30:00.000Z"`   | **FAIL** |
| 5      | Save extraction = `"2026-03-01"`             | `"2026-02-28"` (substring(0,10) of Feb 28 ISO)         | **FAIL** |
| 6      | isoRef = `"2026-02-28T18:30:00.000Z"`        | `"2026-02-28T18:30:00.000Z"`                           | PASS     |

## Outcome

**FAIL-3** — Bug #7 confirmed on legacy preset init path. `useLegacy=true` does not protect against Bug #7. Same behavior as non-legacy 5-A-IST.

## Findings

- **Bug #7 confirmed for legacy Config E in IST.** `parseDateString(initialDate, false, true)` → strips Z → `moment("2026-03-01T11:31:09.996")` parses as IST local → `.startOf('day')` → IST midnight March 1 = `2026-02-28T18:30:00.000Z`. UTC date is Feb 28.
- `useLegacy=true` does not protect against Bug #7 — the `parseDateString` code is shared between legacy and non-legacy date-only preset paths. The bug fires before the legacy/non-legacy divergence point.
- Display (`rawLocal = "3/1/2026"`) is correct — `.toLocaleDateString()` shows the IST date. The corruption is only visible through `.toISOString()` and save extraction.
- GFV returns a **Date object** (legacy path returns raw value) — the Date itself is wrong, so the return type doesn't matter.
- Same behavior as 5-A-IST (Config A) and 5-B-IST (Config B) — confirms Bug #7 is config-independent for all date-only presets in UTC+.
