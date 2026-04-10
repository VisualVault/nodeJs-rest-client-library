# TC-8-G-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-8-G-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8-G-BRT.md) | **Summary**: [summary](../summaries/tc-8-G-BRT.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-8-G-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy DateTime Config G: GFV returns raw unchanged (NOT real UTC). useLegacy=true skips non-legacy branch. Same as Config H.
