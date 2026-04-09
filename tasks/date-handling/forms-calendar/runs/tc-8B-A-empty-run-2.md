# TC-8B-A-empty — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-8B-A-empty.md](../test-cases/tc-8B-A-empty.md) | **Summary**: [summary](../summaries/tc-8B-A-empty.md)

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

- Chromium verification for TC-8B-A-empty
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: GDOC returns undefined for empty date-only Config A. Falsy, safe for developer checks. Same as 8B-D-empty.
