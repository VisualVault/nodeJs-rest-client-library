# TC-1-H-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-1-H-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-H-IST.md) | **Summary**: [summary](../summaries/tc-1-H-IST.md)

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
| raw    | `"2026-03-15T00:00:00"` | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #2. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-1-H-IST
- Expected failure — Bug #2
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Same as G-IST. Legacy DateTime + ignoreTZ no-op. Bug #2.
