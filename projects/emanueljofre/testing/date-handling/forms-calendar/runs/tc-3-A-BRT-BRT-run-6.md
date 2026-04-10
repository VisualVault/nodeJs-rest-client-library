# TC-3-A-BRT-BRT — Run 6 | 2026-04-09 | BRT | PASS

**Spec**: [tc-3-A-BRT-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-A-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-A-BRT-BRT.md)

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

- Chromium verification for TC-3-A-BRT-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Date-only save/reload in same TZ. Value survives round-trip through server. No shift in BRT.
