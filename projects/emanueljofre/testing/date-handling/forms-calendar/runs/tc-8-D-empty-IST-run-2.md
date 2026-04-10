# TC-8-D-empty-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-8-D-empty-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-8-D-empty-IST.md) | **Summary**: [summary](../summaries/tc-8-D-empty-IST.md)

## Environment

| Parameter   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                  |
| Browser     | Firefox (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Platform    | VisualVault FormViewer                                                      |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-firefox`) |

## Step Results

| Step # | Expected | Actual           | Match    |
| ------ | -------- | ---------------- | -------- |
| raw    | `""`     | `"Invalid Date"` | **FAIL** |
| api    | `""`     | `"not captured"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #6. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-8-D-empty-IST
- Expected failure — Bug #6
- Test context: EXPECTED FAIL: Bug #6 in IST — confirms TZ-independent. GFV returns "Invalid Date" (truthy) for empty Config D. Same behavior as BRT.
