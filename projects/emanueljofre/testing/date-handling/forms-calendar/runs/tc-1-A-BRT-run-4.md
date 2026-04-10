# TC-1-A-BRT — Run 4 | 2026-04-01 | BRT | PASS

**Spec**: [tc-1-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-BRT.md) | **Summary**: [summary](../summaries/tc-1-A-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-04-01                                  |
| Browser   | WebKit (Playwright headless)                |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT)             |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 01 2026 10:29:00 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField7"]` ✓                                                                   |

## Step Results

| Step # | Expected                           | Actual                       | Match |
| ------ | ---------------------------------- | ---------------------------- | ----- |
| 3      | `"03/15/2026"` (display)           | `"03/15/2026"`               | PASS  |
| 4      | `"2026-03-15"` (raw stored)        | `"2026-03-15"`               | PASS  |
| 5      | `"2026-03-15"` (GetFieldValue)     | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-15T03:00:00.000Z"` (ISO) | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. WebKit produces identical results to Chrome (runs 1-3).

## Findings

- First WebKit run for this TC — confirms cross-browser consistency for Config A in BRT
- Bug #7 remains not triggered (BRT is UTC-3, local midnight is same UTC calendar day)
- Playwright `timezoneId: 'America/Sao_Paulo'` works correctly in WebKit headless
- Calendar popup day click required JS dispatch in headless WebKit (Playwright actionability check failed due to overlapping elements) — does not affect test validity, only automation technique
- Form instance: DateTest-000102
