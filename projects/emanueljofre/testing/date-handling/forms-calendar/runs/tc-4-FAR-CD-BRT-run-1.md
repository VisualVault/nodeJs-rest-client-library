# TC-4-FAR-CD-BRT — Run 1 | 2026-04-08 | BRT | PASS

**Spec**: [tc-4-FAR-CD-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-4-FAR-CD-BRT.md) | **Summary**: [summary](../summaries/tc-4-FAR-CD-BRT.md)

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
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-4-FAR-CD-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: C→D BRT: Accidentally correct! Source C returns "2026-03-15T03:00:00.000Z" (real UTC, BRT midnight). Target D strips Z → "...T03:00:00.000" → new Date() parses as UTC 03:00 (thanks to .000) → BRT local midnight. Value survives because UTC→local conversion recovers the original time.
