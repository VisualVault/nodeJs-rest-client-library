# TC-4-A-us-BRT — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-4-A-us-BRT.md](../test-cases/tc-4-A-us-BRT.md) | **Summary**: [summary](../summaries/tc-4-A-us-BRT.md)

## Environment

| Parameter   | Value                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Date        | 2026-04-08                                                                        |
| Browser     | Chromium (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                       |
| Platform    | VisualVault FormViewer                                                            |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-chromium`) |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"03/15/2026"` | `"03/15/2026"` | PASS  |
| api    | `"03/15/2026"` | `"03/15/2026"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-A-us-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: US date format in URL. Stored as-is without ISO normalization — raw preserves MM/DD/YYYY.
