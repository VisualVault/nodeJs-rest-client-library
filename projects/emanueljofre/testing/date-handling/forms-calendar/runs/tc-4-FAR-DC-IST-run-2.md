# TC-4-FAR-DC-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-4-FAR-DC-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-4-FAR-DC-IST.md) | **Summary**: [summary](../summaries/tc-4-FAR-DC-IST.md)

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
| api    | `"2026-03-15T00:00:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-FAR-DC-IST
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: D→C IST: Source fake Z (IST midnight labeled as UTC) → target C stores IST 05:30 Mar 15. The +5:30h shift turns midnight into early morning.
