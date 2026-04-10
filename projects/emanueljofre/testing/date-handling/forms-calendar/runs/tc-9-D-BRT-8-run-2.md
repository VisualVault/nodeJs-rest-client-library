# TC-9-D-BRT-8 — Run 2 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-9-D-BRT-8.md](tasks/date-handling/forms-calendar/test-cases/tc-9-D-BRT-8.md) | **Summary**: [summary](../summaries/tc-9-D-BRT-8.md)

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
| raw    | `"2026-03-15T00:00:00"` | `""2026-03-14T00:00:00""` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"not captured"`          | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-9-D-BRT-8
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Bug #5 cumulative drift. 8 trips × -3h = -24h → full day lost. Stored value becomes "2026-03-14T00:00:00".
