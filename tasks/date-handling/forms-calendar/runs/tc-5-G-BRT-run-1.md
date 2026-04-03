# TC-5-G-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-5-G-BRT.md](../test-cases/tc-5-G-BRT.md) | **Summary**: [summary](../summaries/tc-5-G-BRT.md)

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
| TZ           | `new Date().toString()`                                                                  | `"Fri Apr 03 2026 16:50:01 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                              | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=true, ignoreTimezone=false, useLegacy=true, enableInitialValue=true | `Field21` with initialDate `"2026-03-01T11:32:23.628Z"` ✓                            |

## Step Results

| Step # | Expected                                            | Actual                                     | Match |
| ------ | --------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/01/2026`                               | `03/01/2026` (rawLocal = `"3/1/2026"`)     | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-01T11:32:23.628Z"` | `"2026-03-01T11:32:23.628Z"` (Date object) | PASS  |
| 4      | GFV = `"2026-03-01T11:32:23.628Z"`                  | `"2026-03-01T11:32:23.628Z"` (Date object) | PASS  |
| 5      | isoRef = `"2026-03-01T03:00:00.000Z"`               | `"2026-03-01T03:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Legacy DateTime preset stores raw Date identical to `initialDate`. GFV returns raw Date as-is (legacy bypasses all transformations). Same behavior as non-legacy Config C.

## Findings

- DateTime presets bypass `parseDateString` truncation for both legacy and non-legacy. Raw value is `new Date(initialDate)` with no modification.
- GFV returns a **Date object** (not string) for legacy DateTime fields — the legacy `getCalendarFieldValue` path returns the raw value unchanged, unlike non-legacy Config C which returns a string via `new Date(value).toISOString()`.
- No Bug #5 — legacy path does not apply the fake Z format string. `useLegacy=true` bypasses the `moment(value).format("YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")` path entirely.
- Identical result to 5-C-BRT at the value level, though the return type differs (Date vs string).
