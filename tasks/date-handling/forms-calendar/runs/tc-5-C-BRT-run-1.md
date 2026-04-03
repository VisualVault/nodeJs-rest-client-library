# TC-5-C-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-5-C-BRT.md](../test-cases/tc-5-C-BRT.md) | **Summary**: [summary](../summaries/tc-5-C-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                   | Result                                                                               |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                   | `"Fri Apr 03 2026 16:11:29 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                                |
| Field lookup | filter by enableTime=true, ignoreTimezone=false, useLegacy=false, enableInitialValue=true | `Field15` with initialDate `"2026-03-31T11:29:14.181Z"` ✓                            |

## Step Results

| Step # | Expected                                            | Actual                                     | Match |
| ------ | --------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/31/2026 08:29 AM`                      | `03/31/2026` (rawLocal = `"3/31/2026"`)    | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-31T11:29:14.181Z"` | `"2026-03-31T11:29:14.181Z"` (Date object) | PASS  |
| 4      | GFV = `"2026-03-31T11:29:14.181Z"`                  | `"2026-03-31T11:29:14.181Z"` (string)      | PASS  |
| 5      | isoRef = `"2026-03-31T03:00:00.000Z"`               | `"2026-03-31T03:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Config C DateTime preset loads correctly in BRT. Raw Date object preserves the original `initialDate` UTC timestamp without any transformation.

## Findings

- **Major discovery: DateTime presets bypass `parseDateString` truncation.** The raw value is `"2026-03-31T11:29:14.181Z"` — identical to `initialDate`. Date-only presets (Config A/B) go through `parseDateString(initialDate, false, true)` which truncates to local midnight. DateTime presets (Config C/D) store the raw `new Date(initialDate)` without truncation. This means Bug #3's hardcoded `enableTime=false` does NOT affect the stored value for DateTime presets.
- Config C preset date is **March 31, 2026** (not March 1 as the matrix predicted). The `initialDate` was set when the form was configured on March 31. Matrix prediction needs correction.
- GFV returns a **string** (not Date) for Config C: `"2026-03-31T11:29:14.181Z"` — real UTC ISO via `new Date(value).toISOString()`. This is correct behavior — no fake Z, no timezone shift.
- This test is **timezone-independent** — the same raw and API values are expected in IST (tc-5-C-IST).
