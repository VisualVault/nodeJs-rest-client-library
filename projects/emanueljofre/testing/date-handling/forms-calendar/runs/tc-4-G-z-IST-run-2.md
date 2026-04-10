# TC-4-G-z-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-4-G-z-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-4-G-z-IST.md) | **Summary**: [summary](../summaries/tc-4-G-z-IST.md)

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

| Step # | Expected                | Actual                             | Match    |
| ------ | ----------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T20:00:00"` | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15T20:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #1. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-G-z-IST
- Expected failure — Bug #1
- API value not captured — test stopped at raw value assertion failure
- Test context: Legacy DateTime Z in IST. FORM-BUG-1: +5:30h shift. No fake Z on API.
