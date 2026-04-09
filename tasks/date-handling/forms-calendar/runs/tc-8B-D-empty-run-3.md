# TC-8B-D-empty — Run 3 | 2026-04-09 | BRT | PASS

**Spec**: [tc-8B-D-empty.md](../test-cases/tc-8B-D-empty.md) | **Summary**: [summary](../summaries/tc-8B-D-empty.md)

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

- Chromium verification for TC-8B-D-empty
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: GDOC returns undefined for empty Config D field (not null). No throw, no "Invalid Date". Falsy value — safe for developer checks. Contrasts Bug #6 in GFV.
