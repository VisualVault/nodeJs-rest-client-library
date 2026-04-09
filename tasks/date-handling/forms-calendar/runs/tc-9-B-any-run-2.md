# TC-9-B-any — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-9-B-any.md](../test-cases/tc-9-B-any.md) | **Summary**: [summary](../summaries/tc-9-B-any.md)

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

- Chromium verification for TC-9-B-any
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config B: ignoreTimezone=true has no effect on date-only fields. Same zero drift as Config A. Proves Bug #5 requires enableTime=true + ignoreTimezone=true.
