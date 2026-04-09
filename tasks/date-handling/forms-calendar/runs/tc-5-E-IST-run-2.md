# TC-5-E-IST — Run 2 | 2026-04-09 | IST | FAIL

**Spec**: [tc-5-E-IST.md](../test-cases/tc-5-E-IST.md) | **Summary**: [summary](../summaries/tc-5-E-IST.md)

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
| raw    | `"2026-03-01"` | `"2026-02-28T18:30:00.000Z"`       | **FAIL** |
| api    | `"2026-03-01"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #7. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-5-E-IST
- Expected failure — Bug #7
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #7 on legacy preset init path. useLegacy=true does not protect — parseDateString is shared. IST midnight March 1 = Feb 28 UTC. Display correct but internal Date wrong. Same as non-legacy 5-A-IST.
