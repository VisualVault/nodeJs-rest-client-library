# TC-9-B-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-9-B-IST.md](../test-cases/tc-9-B-IST.md) | **Summary**: [summary](../summaries/tc-9-B-IST.md)

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
| raw    | `"2026-03-15"` | `"2026-03-13"`                     | **FAIL** |
| api    | `"2026-03-15"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-9-B-IST
- Expected failure — Bug #7
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #7 on date-only in IST. Initial SFV stores "2026-03-14" (Bug #7), then round-trip SFV stores "2026-03-13" (Bug #7 again). -1 day per SFV call.
