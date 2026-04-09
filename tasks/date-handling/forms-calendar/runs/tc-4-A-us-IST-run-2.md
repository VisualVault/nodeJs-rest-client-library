# TC-4-A-us-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-4-A-us-IST.md](../test-cases/tc-4-A-us-IST.md) | **Summary**: [summary](../summaries/tc-4-A-us-IST.md)

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
| raw    | `"03/15/2026"` | `"unknown"`                        | **FAIL** |
| api    | `"03/15/2026"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — No bugs triggered. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-A-us-IST
- Expected failure — assertion mismatch
- API value not captured — test stopped at raw value assertion failure
- Test context: US format in IST. Stored as-is, same as BRT.
