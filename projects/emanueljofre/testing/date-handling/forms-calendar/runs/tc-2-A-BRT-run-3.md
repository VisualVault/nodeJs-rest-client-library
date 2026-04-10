# TC-2-A-BRT — Run 3 | 2026-04-03 | BRT | PASS

**Spec**: [tc-2-A-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-2-A-BRT.md) | **Summary**: [summary](../summaries/tc-2-A-BRT.md)

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

- Firefox verification for TC-2-A-BRT
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Date-only typed input baseline. No TZ shift in BRT. Matches popup (1-A-BRT) — Bug #2 absent.
