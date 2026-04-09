# TC-8B-A-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-8B-A-BRT.md](../test-cases/tc-8B-A-BRT.md) | **Summary**: [summary](../summaries/tc-8B-A-BRT.md)

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

- Chromium verification for TC-8B-A-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Date-only Config A GDOC: creates Date at local BRT midnight. toISOString gives real UTC (+3h). Identical to Config E (legacy).
