# TC-7-H-isoZ-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-7-H-isoZ-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-7-H-isoZ-BRT.md) | **Summary**: [summary](../summaries/tc-7-H-isoZ-BRT.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-14T21:00:00"` | `"2026-03-14T21:00:00"` | PASS  |
| api    | `"2026-03-14T21:00:00"` | `"2026-03-14T21:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-7-H-isoZ-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Same UTC→local shift as D-isoZ. GFV returns raw without fake Z (useLegacy protects from Bug #5). Key comparison.
