# TC-5-B-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-5-B-BRT.md](../test-cases/tc-5-B-BRT.md) | **Summary**: [summary](../summaries/tc-5-B-BRT.md)

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

- Chromium verification for TC-5-B-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config B preset in BRT. Date-only + ignoreTZ. Raw = Date at BRT midnight (UTC 03:00). No Bug #7 in BRT (negative offset preserves date). Save extraction: toISOString().substring(0,10) = "2026-03-01".
