# TC-4-FAR-CA-BRT — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-4-FAR-CA-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-4-FAR-CA-BRT.md) | **Summary**: [summary](../summaries/tc-4-FAR-CA-BRT.md)

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
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-FAR-CA-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: C→A BRT: Source C returns "2026-03-15T03:00:00.000Z". Target A (date-only) truncates at T → "2026-03-15". Correct date preserved despite UTC time.
