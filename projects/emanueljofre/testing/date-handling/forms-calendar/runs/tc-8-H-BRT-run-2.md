# TC-8-H-BRT — Run 2 | 2026-04-03 | BRT | PASS

**Spec**: [tc-8-H-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8-H-BRT.md) | **Summary**: [summary](../summaries/tc-8-H-BRT.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-8-H-BRT
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Config H legacy control: useLegacy=true skips Bug #5 fake-Z branch. GFV returns raw value unchanged. Zero round-trip drift — contrasts Config D which drifts -3h/trip in BRT.
