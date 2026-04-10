# TC-7-A-dateOnly-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-7-A-dateOnly-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-7-A-dateOnly-IST.md) | **Summary**: [summary](../summaries/tc-7-A-dateOnly-IST.md)

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

| Step # | Expected       | Actual                             | Match    |
| ------ | -------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15"` | `"2026-03-14"`                     | **FAIL** |
| api    | `"2026-03-15"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-7-A-dateOnly-IST
- Expected failure — Bug #7
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #7 stores "2026-03-14" (-1 day). moment("2026-03-15").toDate() = IST midnight → UTC Mar 14 → getSaveValue extracts wrong day.
