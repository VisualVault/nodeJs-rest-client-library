# TC-9-GDOC-A-IST-1 — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-9-GDOC-A-IST-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-GDOC-A-IST-1.md) | **Summary**: [summary](../summaries/tc-9-GDOC-A-IST-1.md)

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
| raw    | `"2026-03-15"` | `"2026-03-12"`                     | **FAIL** |
| api    | `"2026-03-15"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-9-GDOC-A-IST-1
- Expected failure — Bug #7
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Double FORM-BUG-7 compound shift. Initial SFV stores "2026-03-14" (-1d). GDOC ISO "2026-03-13T18:30:00.000Z" → SFV strips to "2026-03-13" → Bug #7 again → stores "2026-03-12" (-3d total). GDOC round-trip UNSAFE for date-only in UTC+.
