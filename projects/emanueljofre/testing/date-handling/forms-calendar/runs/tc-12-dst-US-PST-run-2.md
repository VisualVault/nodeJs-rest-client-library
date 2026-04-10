# TC-12-dst-US-PST — Run 2 | 2026-04-09 | PST | FAIL

**Spec**: [tc-12-dst-US-PST.md](tasks/date-handling/forms-calendar/test-cases/tc-12-dst-US-PST.md) | **Summary**: [summary](../summaries/tc-12-dst-US-PST.md)

## Environment

| Parameter   | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Date        | 2026-04-09                                                                        |
| Browser     | Chromium (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                       |
| Platform    | VisualVault FormViewer                                                            |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project PST-chromium`) |

## Step Results

| Step # | Expected                | Actual                             | Match    |
| ------ | ----------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-08T02:00:00"` | `"2026-03-07T19:00:00"`            | **FAIL** |
| api    | `"2026-03-08T02:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-12-dst-US-PST
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: DST spring-forward + Bug #5 compound. V8 advances 2AM→3AM. Fake Z "T03:00:00.000Z" → UTC lands in pre-DST window → PST Mar 7 19:00 (-8h). Crosses day + DST boundary.
