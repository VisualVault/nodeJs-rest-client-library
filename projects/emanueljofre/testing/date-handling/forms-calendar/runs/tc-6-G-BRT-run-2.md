# TC-6-G-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-6-G-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-6-G-BRT.md) | **Summary**: [summary](../summaries/tc-6-G-BRT.md)

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

| Step # | Expected    | Actual      | Match |
| ------ | ----------- | ----------- | ----- |
| raw    | `"dynamic"` | `"dynamic"` | PASS  |
| api    | `"dynamic"` | `"dynamic"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-6-G-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy DateTime Current Date in BRT. Stores correct UTC timestamp. Legacy GFV returns raw Date unchanged — no transformation.
