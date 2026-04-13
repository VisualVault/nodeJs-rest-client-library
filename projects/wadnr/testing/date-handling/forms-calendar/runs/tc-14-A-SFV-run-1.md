# TC-14-A-SFV — Run 1 | 2026-04-13 | BRT | PASS

**Spec**: [tc-14-A-SFV.md](../../../../tasks/date-handling/forms-calendar/test-cases/tc-14-A-SFV.md) | **Summary**: [summary](../summaries/tc-14-A-SFV.md)

## Environment

| Parameter   | Value                                                |
| ----------- | ---------------------------------------------------- |
| Date        | 2026-04-13                                           |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                     |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)          |
| Platform    | VisualVault FormViewer, Build 20260410.1             |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`)     |

## Preconditions Verified

| Check        | Command                                                     | Result                                                     |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Mon Apr 13 2026 09:50:13 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                      |
| Field lookup | filter enableTime=false, ignoreTimezone=false, useLegacy=false | `["Field7"]` ✓                                          |

## Step Results

| Step # | Expected       | Actual       | Match |
| ------ | -------------- | ------------ | ----- |
| 3      | `"2026-03-15"` | `"2026-03-15"` | PASS |
| 4      | `"2026-03-15"` | `"2026-03-15"` | PASS |
| 5      | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS |

## Outcome

**PASS** — Config A date-only SetFieldValue stores and returns value unchanged. Unmasked baseline confirmed.

## Findings

- Raw and API values match exactly — no bugs in BRT for Config A
- Baseline established for Phase C mask comparison
- isoRef confirms BRT timezone active
