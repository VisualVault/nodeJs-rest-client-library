# TC-7-A-usFormat — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-7-A-usFormat.md](tasks/date-handling/forms-calendar/test-cases/tc-7-A-usFormat.md) | **Summary**: [summary](../summaries/tc-7-A-usFormat.md)

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

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-7-A-usFormat
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: US date format parsed by moment as local midnight. Correct in BRT. Bug #7 would shift in UTC+.
