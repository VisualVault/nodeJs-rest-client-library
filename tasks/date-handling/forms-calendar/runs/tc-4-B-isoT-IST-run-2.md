# TC-4-B-isoT-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-4-B-isoT-IST.md](../test-cases/tc-4-B-isoT-IST.md) | **Summary**: [summary](../summaries/tc-4-B-isoT-IST.md)

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
| raw    | `"2026-03-15"` | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — No bugs triggered. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-B-isoT-IST
- Expected failure — assertion mismatch
- API value not captured — test stopped at raw value assertion failure
- Test context: Config B in IST. No FORM-BUG-7 via URL path, same as Config A.
