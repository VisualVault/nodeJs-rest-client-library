# TC-1-B-BRT — Run 3 | 2026-04-03 | BRT | PASS

**Spec**: [tc-1-B-BRT.md](../test-cases/tc-1-B-BRT.md) | **Summary**: [summary](../summaries/tc-1-B-BRT.md)

## Environment

| Parameter   | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                       |
| Browser     | Firefox (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                      |
| Platform    | VisualVault FormViewer                                                           |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-firefox`) |

## Step Results

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-1-B-BRT
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Config B date-only + ignoreTZ. Same as A in BRT — ignoreTZ inert for date-only fields.
