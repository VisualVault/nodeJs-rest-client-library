# TC-4-FAR-DD-BRT — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-4-FAR-DD-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-4-FAR-DD-BRT.md) | **Summary**: [summary](../summaries/tc-4-FAR-DD-BRT.md)

## Environment

| Parameter   | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                        |
| Browser     | Chromium (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                       |
| Platform    | VisualVault FormViewer                                                            |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-chromium`) |

## Step Results

| Step # | Expected                     | Actual                             | Match    |
| ------ | ---------------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-14T21:00:00"`      | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-14T21:00:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5, Bug #1. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-FAR-DD-BRT
- Expected failure — Bug #5, Bug #1
- API value not captured — test stopped at raw value assertion failure
- Test context: D→D BRT: CRITICAL — bugs COMPOUND, not cancel! Source fake Z ".000Z" → strip Z → ".000" remains → new Date("...T00:00:00.000") parsed as UTC (not local!) → UTC midnight in BRT = 21:00 Mar 14. The .000 ms residue changes Date() parsing semantics.
