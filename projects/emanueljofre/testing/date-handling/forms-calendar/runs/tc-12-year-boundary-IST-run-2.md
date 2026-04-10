# TC-12-year-boundary-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-12-year-boundary-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-12-year-boundary-IST.md) | **Summary**: [summary](../summaries/tc-12-year-boundary-IST.md)

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

| Step # | Expected                | Actual                  | Match    |
| ------ | ----------------------- | ----------------------- | -------- |
| raw    | `"2026-01-01T00:00:00"` | `"2026-01-01T05:30:00"` | **FAIL** |
| api    | `"2026-01-01T00:00:00"` | `"not captured"`        | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-12-year-boundary-IST
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Year boundary in IST. +5:30h drift stays in 2026 (opposite of BRT which crosses to 2025). Less destructive at year boundaries for UTC+ users.
