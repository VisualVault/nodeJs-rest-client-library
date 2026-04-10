# TC-8B-D-UTC0 — Run 1 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-8B-D-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-8B-D-UTC0.md) | **Summary**: [summary](../summaries/tc-8B-D-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Browser     | Chromium (Playwright headless)              |
| Tester TZ   | Etc/GMT — UTC+0                             |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer                      |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                                | Result                                                      |
| ------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                | `"...GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                            | `false` → V1 active ✓                                       |
| Field lookup | filter enableTime=true, ignoreTimezone=true, useLegacy=false, enableInitialValue=false | `["Field5"]` ✓                                              |

## Step Results

| Step # | Expected                                 | Actual                                                      | Match |
| ------ | ---------------------------------------- | ----------------------------------------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`                  | `"2026-03-15T00:00:00"`                                     | PASS  |
| str    | Contains `Mar 15 2026 00:00:00 GMT+0000` | `"Sun Mar 15 2026 00:00:00 GMT+0000 (Greenwich Mean Time)"` | PASS  |
| iso    | `"2026-03-15T00:00:00.000Z"`             | `"2026-03-15T00:00:00.000Z"`                                | PASS  |

## Outcome

**PASS** — Config D GDOC at UTC+0. GDOC.toISOString() and GFV fake Z produce identical strings.

## Findings

- Bug #5 invisible at UTC+0 when comparing GDOC vs GFV
- Completes Config D GDOC 3-TZ spectrum (BRT, IST, UTC0 all PASS)
- At UTC+0, local midnight = UTC midnight, so GDOC and GFV outputs are indistinguishable
