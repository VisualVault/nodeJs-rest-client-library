# TC-6-G-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-6-G-BRT.md](../test-cases/tc-6-G-BRT.md) | **Summary**: [summary](../summaries/tc-6-G-BRT.md)

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
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 17:20:15 GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                       |
| Field lookup | `getValueObjectValue('Field25')` non-empty                  | Date object `"2026-04-03T20:20:07.986Z"` — auto-populated ✓                 |

## Step Results

| Step # | Expected                     | Actual                                     | Match |
| ------ | ---------------------------- | ------------------------------------------ | ----- |
| 2      | Display today with time      | `04/03/2026 05:20 PM`                      | PASS  |
| 3      | UTC ISO string — Date object | `"2026-04-03T20:20:07.986Z"` (Date object) | PASS  |
| 4      | GFV = raw Date               | `"2026-04-03T20:20:07.986Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config G legacy DateTime Current Date correct in BRT. Raw is a UTC Date object, and GFV returns the raw Date unchanged. Legacy DateTime init path is identical to Config C (non-legacy).

## Findings

- **Legacy DateTime Current Date stores real UTC timestamp**: `new Date()` produces a genuine UTC timestamp. No timezone-sensitive parsing involved
- **GFV returns raw Date object**: For legacy fields (`useLegacy=true`), `getCalendarFieldValue()` returns the stored value as-is — no string formatting or fake Z
- **Identical init path to Config C (6-C-BRT)**: The `useLegacy` flag does not affect the `new Date()` init. The only difference is GFV output format (Date object vs ISO string), and both are correct
