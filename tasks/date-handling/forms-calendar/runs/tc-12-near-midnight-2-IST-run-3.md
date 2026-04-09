# TC-12-near-midnight-2-IST — Run 3 | 2026-04-09 | IST | FAIL

**Spec**: [tc-12-near-midnight-2-IST.md](../test-cases/tc-12-near-midnight-2-IST.md) | **Summary**: [summary](../summaries/tc-12-near-midnight-2-IST.md)

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

| Step # | Expected                | Actual                             | Match    |
| ------ | ----------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T23:00:00"` | `"2026-03-16T04:30:00"`            | **FAIL** |
| api    | `"2026-03-15T23:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-12-near-midnight-2-IST
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Near-midnight round-trip in IST. +5:30h drift → 04:30 next day. Day crosses FORWARD after 1 trip (opposite of BRT -3h staying same day).
