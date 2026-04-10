# TC-6-E-BRT — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-6-E-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-6-E-BRT.md) | **Summary**: [summary](../summaries/tc-6-E-BRT.md)

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
| Field lookup | `getValueObjectValue('Field23')` non-empty                  | Date object `"2026-04-03T20:20:07.985Z"` — auto-populated ✓                 |

## Step Results

| Step # | Expected                         | Actual                                     | Match |
| ------ | -------------------------------- | ------------------------------------------ | ----- |
| 2      | Display today's BRT date         | `04/03/2026`                               | PASS  |
| 3      | UTC ISO string with today's date | `"2026-04-03T20:20:07.985Z"` (Date object) | PASS  |
| 4      | Raw local date = today           | `"04/03/2026"` = `"04/03/2026"`            | PASS  |
| 5      | GFV = raw Date                   | `"2026-04-03T20:20:07.985Z"` (Date object) | PASS  |

## Outcome

**PASS** — Config E legacy date-only Current Date correct in BRT. Display shows today's BRT date, raw is a UTC Date object, and GFV returns the raw Date unchanged. Legacy behavior is identical to non-legacy Config A (6-A-BRT).

## Findings

- **Legacy date-only Current Date identical to non-legacy**: The `new Date()` init path bypasses all legacy-specific code paths. Config E produces the same result as Config A
- **GFV returns raw Date unchanged**: For legacy fields, `getCalendarFieldValue()` returns the stored value as-is — no string formatting applied
- **No transformation bugs**: Current Date is the only consistently correct init path across all configs
