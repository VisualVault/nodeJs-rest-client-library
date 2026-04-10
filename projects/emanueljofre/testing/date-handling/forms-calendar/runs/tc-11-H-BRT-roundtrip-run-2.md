# TC-11-H-BRT-roundtrip — Run 2 | 2026-04-09 | BRT | PASS

**Spec**: [tc-11-H-BRT-roundtrip.md](tasks/date-handling/forms-calendar/test-cases/tc-11-H-BRT-roundtrip.md) | **Summary**: [summary](../summaries/tc-11-H-BRT-roundtrip.md)

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

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-11-H-BRT-roundtrip
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Config H multi-trip control: useLegacy=true GFV returns raw (no fake Z). 0 drift after 3 trips. Confirms legacy immunity to FORM-BUG-5 — safe for cross-TZ scenarios.
