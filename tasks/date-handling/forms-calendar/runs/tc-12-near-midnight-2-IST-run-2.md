# TC-12-near-midnight-2-IST — Run 2 | 2026-04-03 | IST | FAIL

**Spec**: [tc-12-near-midnight-2-IST.md](../test-cases/tc-12-near-midnight-2-IST.md) | **Summary**: [summary](../summaries/tc-12-near-midnight-2-IST.md)

## Environment

| Parameter   | Value                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                  |
| Browser     | Firefox (Playwright headless)                                               |
| Tester TZ   | Asia/Kolkata — UTC+5:30 (IST)                                               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Platform    | VisualVault FormViewer                                                      |
| Test Method | Playwright regression (`timezoneId: Asia/Kolkata`, `--project IST-firefox`) |

## Step Results

| Step # | Expected                | Actual                  | Match    |
| ------ | ----------------------- | ----------------------- | -------- |
| raw    | `"2026-03-15T23:00:00"` | `"2026-03-16T04:30:00"` | **FAIL** |
| api    | `"2026-03-15T23:00:00"` | `"not captured"`        | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-12-near-midnight-2-IST
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Near-midnight round-trip in IST. +5:30h drift → 04:30 next day. Day crosses FORWARD after 1 trip (opposite of BRT -3h staying same day).
