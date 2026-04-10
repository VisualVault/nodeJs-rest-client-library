# TC-12-dst-transition — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-12-dst-transition.md](tasks/date-handling/forms-calendar/test-cases/tc-12-dst-transition.md) | **Summary**: [summary](../summaries/tc-12-dst-transition.md)

## Environment

| Parameter   | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                       |
| Browser     | Firefox (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                      |
| Platform    | VisualVault FormViewer                                                           |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-firefox`) |

## Step Results

| Step # | Expected                | Actual                    | Match    |
| ------ | ----------------------- | ------------------------- | -------- |
| raw    | `"2026-03-08T02:00:00"` | `""2026-03-07T23:00:00""` | **FAIL** |
| api    | `"2026-03-08T02:00:00"` | `"not captured"`          | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-12-dst-transition
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: US DST transition day (Mar 8 2026 02:00). BRT has no DST — standard -3h drift. 02:00 -3h = previous day 23:00. Needs retest from US TZ browser.
