# TC-12-near-midnight-1 — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-12-near-midnight-1.md](tasks/date-handling/forms-calendar/test-cases/tc-12-near-midnight-1.md) | **Summary**: [summary](../summaries/tc-12-near-midnight-1.md)

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

| Step # | Expected                | Actual                         | Match    |
| ------ | ----------------------- | ------------------------------ | -------- |
| raw    | `"2026-03-14T21:30:00"` | `""2026-03-14T21:30:00.000Z""` | **FAIL** |
| api    | `"2026-03-14T21:30:00"` | `"not captured"`               | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-12-near-midnight-1
- Expected failure — Bug #5
- Test context: ISO+Z near midnight: UTC 00:30 → BRT Mar 14 21:30. Day crosses on input. Bug #5 fake Z creates double jeopardy: shifted value + will drift on round-trips.
