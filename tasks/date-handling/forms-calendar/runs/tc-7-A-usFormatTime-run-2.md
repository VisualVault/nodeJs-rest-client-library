# TC-7-A-usFormatTime — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-7-A-usFormatTime.md](../test-cases/tc-7-A-usFormatTime.md) | **Summary**: [summary](../summaries/tc-7-A-usFormatTime.md)

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

- Chromium verification for TC-7-A-usFormatTime
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: US format with time component. Time stripped for date-only Config A. Same result as plain US format.
