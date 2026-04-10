# TC-4-FAR-DD-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-4-FAR-DD-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-4-FAR-DD-IST.md) | **Summary**: [summary](../summaries/tc-4-FAR-DD-IST.md)

## Environment

| Parameter   | Value                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                   |
| Browser     | Chromium (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                                |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                  |
| Platform    | VisualVault FormViewer                                                       |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-chromium`) |

## Step Results

| Step # | Expected                     | Actual                             | Match    |
| ------ | ---------------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T05:30:00"`      | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15T05:30:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5, Bug #1. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-FAR-DD-IST
- Expected failure — Bug #5, Bug #1
- API value not captured — test stopped at raw value assertion failure
- Test context: D→D IST: Bugs compound same as BRT. Source fake Z ".000Z" → strip Z → ".000" → UTC parse → UTC midnight in IST = 05:30 Mar 15. The .000 residue causes UTC interpretation.
