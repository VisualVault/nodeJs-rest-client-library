# TC-12-empty-Config-A — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-12-empty-Config-A.md](tasks/date-handling/forms-calendar/test-cases/tc-12-empty-Config-A.md) | **Summary**: [summary](../summaries/tc-12-empty-Config-A.md)

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

| Step # | Expected | Actual | Match |
| ------ | -------- | ------ | ----- |
| raw    | `""`     | `""`   | PASS  |
| api    | `""`     | `""`   | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-12-empty-Config-A
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Control: empty Config A returns "". Confirms Bug #6 requires enableTime=true. Config A (enableTime=false) is immune.
