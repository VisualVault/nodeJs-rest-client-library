# TC-11-save-IST-load-BRT — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-11-save-IST-load-BRT.md](../test-cases/tc-11-save-IST-load-BRT.md) | **Summary**: [summary](../summaries/tc-11-save-IST-load-BRT.md)

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

- Chromium verification for TC-11-save-IST-load-BRT
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: EXPECTED FAIL: Config A shows "2026-03-14" — pre-existing IST save-time FORM-BUG-7 corruption. BRT load is innocent (does not introduce new corruption). Config D on same record: raw preserved, Bug #5 fake Z on GFV.
