# TC-5-H-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-5-H-BRT.md](../test-cases/tc-5-H-BRT.md) | **Summary**: [summary](../summaries/tc-5-H-BRT.md)

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
| raw    | `"2026-03-01T11:33:07.735Z"` | `"2026-03-01T11:33:07.735Z"` | PASS  |
| api    | `"2026-03-01T11:33:07.735Z"` | `"2026-03-01T11:33:07.735Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-5-H-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Legacy DateTime + ignoreTZ preset in BRT. No Bug #5 fake Z — legacy getCalendarFieldValue returns raw value (requires !useLegacy for fake Z path). Safer than non-legacy Config D.
