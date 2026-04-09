# TC-8-D-empty-IST — Run 3 | 2026-04-09 | IST | FAIL

**Spec**: [tc-8-D-empty-IST.md](../test-cases/tc-8-D-empty-IST.md) | **Summary**: [summary](../summaries/tc-8-D-empty-IST.md)

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

| Step # | Expected | Actual                             | Match    |
| ------ | -------- | ---------------------------------- | -------- |
| raw    | `""`     | `"Invalid Date"`                   | **FAIL** |
| api    | `""`     | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #6. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-8-D-empty-IST
- Expected failure — Bug #6
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #6 in IST — confirms TZ-independent. GFV returns "Invalid Date" (truthy) for empty Config D. Same behavior as BRT.
