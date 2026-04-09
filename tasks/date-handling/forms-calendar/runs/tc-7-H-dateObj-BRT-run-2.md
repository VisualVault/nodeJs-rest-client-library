# TC-7-H-dateObj-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-7-H-dateObj-BRT.md](../test-cases/tc-7-H-dateObj-BRT.md) | **Summary**: [summary](../summaries/tc-7-H-dateObj-BRT.md)

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

- Chromium verification for TC-7-H-dateObj-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Date object stores local midnight. No fake Z on GFV (useLegacy=true). Compare Config D dateObj which adds fake Z (Bug #5).
