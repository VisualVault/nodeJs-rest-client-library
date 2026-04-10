# TC-5-E-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-5-E-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-5-E-BRT.md) | **Summary**: [summary](../summaries/tc-5-E-BRT.md)

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

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-01T03:00:00.000Z"` | `"2026-03-01T03:00:00.000Z"` | PASS  |
| api    | `"2026-03-01T03:00:00.000Z"` | `"2026-03-01T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-5-E-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy date-only preset in BRT. Behavior identical to non-legacy Config A. parseDateString truncates to midnight; useLegacy has no effect on date-only init path.
