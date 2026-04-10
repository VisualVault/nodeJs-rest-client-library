# TC-9-GDOC-A-BRT-1 — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-9-GDOC-A-BRT-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-GDOC-A-BRT-1.md) | **Summary**: [summary](../summaries/tc-9-GDOC-A-BRT-1.md)

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

- Chromium verification for TC-9-GDOC-A-BRT-1
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: GDOC round-trip STABLE for Config A (date-only) in BRT. Real UTC "T03:00:00.000Z" → normalizeCalValue → BRT midnight Mar 15 → same date. No FORM-BUG-7 because UTC-3 midnight = same UTC day.
