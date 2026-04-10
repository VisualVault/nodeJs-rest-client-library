# TC-6-E-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-6-E-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-6-E-BRT.md) | **Summary**: [summary](../summaries/tc-6-E-BRT.md)

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

- Chromium verification for TC-6-E-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy date-only Current Date in BRT. new Date() bypasses all legacy-specific code paths. Behavior identical to non-legacy Config A.
