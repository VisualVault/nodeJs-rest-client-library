# TC-1-A-BRT — Run 3 | 2026-04-01 | BRT | PASS

**Spec**: [tc-1-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-BRT.md) | **Summary**: [summary](../summaries/tc-1-A-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                      |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 01 2026 08:20:58 GMT-0300 (Brasilia Standard Time)"` — GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                       |
| Field lookup | filter snippet                                              | `["DataField7"]` ✓                                                          |

## Step Results

| Step # | Expected                             | Actual                       | Match |
| ------ | ------------------------------------ | ---------------------------- | ----- |
| 2      | Display: `03/15/2026`                | `03/15/2026`                 | PASS  |
| 3      | Raw: `"2026-03-15"`                  | `"2026-03-15"`               | PASS  |
| 4      | API: `"2026-03-15"`                  | `"2026-03-15"`               | PASS  |
| 5      | isoRef: `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Date-only Config A stores correct `"2026-03-15"` in BRT.

## Findings

- Actual matches matrix prediction and previous runs (run-1, run-2) — consistent PASS
- No bugs triggered for Config A in BRT (as expected — Bug #7 only affects UTC+)
- First run using Playwright CLI with `timezoneId` override — **confirms Playwright TZ simulation produces identical results to system TZ change** (run-1 used system BRT, run-3 used Playwright `timezoneId: America/Sao_Paulo`)
- Calendar popup interaction required `run-code` with `tbody` targeting to disambiguate months in the scrollable grid — snapshot `e{N}` refs alone hit the wrong month section
- Recommended: use this run as the cross-validation baseline for Playwright vs Chrome MCP equivalence
