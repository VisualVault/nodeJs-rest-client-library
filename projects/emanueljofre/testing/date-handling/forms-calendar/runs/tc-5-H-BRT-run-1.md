# TC-5-H-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-5-H-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-5-H-BRT.md) | **Summary**: [summary](../summaries/tc-5-H-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                 | Result                                                                               |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                 | `"Fri Apr 03 2026 16:50:01 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                             | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=true, ignoreTimezone=true, useLegacy=true, enableInitialValue=true | `Field22` with initialDate `"2026-03-01T11:33:07.735Z"` ✓                            |

## Step Results

| Step # | Expected                                            | Actual                                     | Match |
| ------ | --------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/01/2026`                               | `03/01/2026` (rawLocal = `"3/1/2026"`)     | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-01T11:33:07.735Z"` | `"2026-03-01T11:33:07.735Z"` (Date object) | PASS  |
| 4      | GFV = `"2026-03-01T11:33:07.735Z"`                  | `"2026-03-01T11:33:07.735Z"` (Date object) | PASS  |
| 5      | isoRef = `"2026-03-01T03:00:00.000Z"`               | `"2026-03-01T03:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Legacy DateTime + ignoreTZ preset stores correctly. **No Bug #5** — legacy `getCalendarFieldValue` returns raw value, bypassing the fake Z format path that requires `!useLegacy`. This is the key difference from non-legacy Config D (which FAILS with Bug #5).

## Findings

- Config H is the legacy equivalent of Config D. At BRT, non-legacy D returns `"2026-03-01T08:28:54.627Z"` (fake Z, -3h shift via Bug #5). Legacy H returns the raw Date unchanged.
- `useLegacy=true` is safer for `ignoreTZ` DateTime fields — it avoids the `getCalendarFieldValue` transformation that introduces Bug #5.
- DateTime presets bypass `parseDateString` truncation. Raw value preserves `initialDate` exactly.
- GFV returns a **Date object** (not string) — legacy path returns raw value without any `moment().format()` call.
- Compare with 5-D-BRT (FAIL-3, Bug #5) to see the safety advantage of `useLegacy=true` for this config combination.
