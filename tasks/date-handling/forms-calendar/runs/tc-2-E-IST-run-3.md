# TC-2-E-IST — Run 3 | 2026-04-09 | IST | FAIL

**Spec**: [tc-2-E-IST.md](../test-cases/tc-2-E-IST.md) | **Summary**: [summary](../summaries/tc-2-E-IST.md)

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

- Chromium verification for TC-2-E-IST
- Expected failure — Bug #7
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #7 in legacy typed IST. Stores "2026-03-14" (-1 day).
