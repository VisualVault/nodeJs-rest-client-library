# TC-4-FAR-DC-BRT — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-4-FAR-DC-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-4-FAR-DC-BRT.md) | **Summary**: [summary](../summaries/tc-4-FAR-DC-BRT.md)

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

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-14T21:00:00"`      | `"2026-03-14T21:00:00"`      | PASS  |
| api    | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-FAR-DC-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: D→C BRT: CRITICAL. Source fake Z (BRT midnight labeled as UTC) → target C treats as real UTC midnight → stores BRT 21:00 Mar 14. API shows "correct" UTC but represents the wrong moment (-3h shift).
