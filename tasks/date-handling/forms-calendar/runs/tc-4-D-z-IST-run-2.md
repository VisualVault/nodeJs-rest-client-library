# TC-4-D-z-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-4-D-z-IST.md](../test-cases/tc-4-D-z-IST.md) | **Summary**: [summary](../summaries/tc-4-D-z-IST.md)

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
| raw    | `"2026-03-15T20:00:00"`      | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15T20:00:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #1, Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-D-z-IST
- Expected failure — Bug #1, Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: FORM-BUG-1 in IST: Z stripped → 14:30 re-parsed as IST local → stored as IST 14:30 = UTC equivalent stored as 20:00. Fake Z on API.
