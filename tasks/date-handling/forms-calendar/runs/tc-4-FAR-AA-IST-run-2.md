# TC-4-FAR-AA-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-4-FAR-AA-IST.md](../test-cases/tc-4-FAR-AA-IST.md) | **Summary**: [summary](../summaries/tc-4-FAR-AA-IST.md)

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
| raw    | `"2026-03-14"` | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-14"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-FAR-AA-IST
- Expected failure — Bug #7
- API value not captured — test stopped at raw value assertion failure
- Test context: A→A IST: FORM-BUG-7 at source shifts to Mar 14. Target receives and preserves the wrong date. URL path itself is safe — damage is upstream.
