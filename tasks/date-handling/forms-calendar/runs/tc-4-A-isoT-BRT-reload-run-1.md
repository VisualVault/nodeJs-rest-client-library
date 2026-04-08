# TC-4-A-isoT-BRT-reload — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-4-A-isoT-BRT-reload.md](../test-cases/tc-4-A-isoT-BRT-reload.md) | **Summary**: [summary](../summaries/tc-4-A-isoT-BRT-reload.md)

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

- Chromium verification for TC-4-A-isoT-BRT-reload
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Clean baseline: date-only URL param → save → reload. Value should survive round-trip unchanged. Confirms TargetDateTest save path works and enableQListener does not interfere on reload (saved record URL has no field params).
