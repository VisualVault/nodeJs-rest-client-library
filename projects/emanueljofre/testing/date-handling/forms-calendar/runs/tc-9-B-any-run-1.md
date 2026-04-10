# TC-9-B-any — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-9-B-any.md](tasks/date-handling/forms-calendar/test-cases/tc-9-B-any.md) | **Summary**: [summary](../summaries/tc-9-B-any.md)

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

- Firefox verification for TC-9-B-any
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Config B: ignoreTimezone=true has no effect on date-only fields. Same zero drift as Config A. Proves Bug #5 requires enableTime=true + ignoreTimezone=true.
