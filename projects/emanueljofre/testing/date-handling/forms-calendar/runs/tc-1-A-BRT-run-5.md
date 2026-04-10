# TC-1-A-BRT — Run 5 | 2026-04-03 | BRT | PASS

**Spec**: [tc-1-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-BRT.md) | **Summary**: [summary](../summaries/tc-1-A-BRT.md)

## Environment

| Parameter   | Value                                                                 |
| ----------- | --------------------------------------------------------------------- |
| Date        | 2026-04-03                                                            |
| Browser     | Firefox (Playwright headless)                                         |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                       |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                           |
| Platform    | VisualVault FormViewer, Build 20260304.1                              |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`, `--browser firefox`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 13:32:36 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["Field7"]` ✓                                                                       |

## Step Results

| Step # | Expected                           | Actual                       | Match |
| ------ | ---------------------------------- | ---------------------------- | ----- |
| 3      | `"03/15/2026"` (display)           | `"03/15/2026"`               | PASS  |
| 4      | `"2026-03-15"` (raw stored)        | `"2026-03-15"`               | PASS  |
| 5      | `"2026-03-15"` (GetFieldValue)     | `"2026-03-15"`               | PASS  |
| 6      | `"2026-03-15T03:00:00.000Z"` (ISO) | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to Chrome (runs 1-3) and WebKit (run 4).

## Findings

- First Firefox run for this TC — confirms cross-browser consistency for Config A in BRT
- All four tested engines (Chrome/Chromium, WebKit, Firefox) now agree on Config A BRT behavior
- Bug #7 remains not triggered (BRT is UTC-3, local midnight is same UTC calendar day)
- Playwright `timezoneId: 'America/Sao_Paulo'` works correctly in Firefox headless
- Calendar day selection required JS DOM click dispatch (Kendo grid cell title-based lookup) — Firefox same as WebKit
- Form instance: DateTest-001233
