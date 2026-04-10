# TC-7-C-isoNoZ — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-C-isoNoZ.md](tasks/date-handling/forms-calendar/test-cases/tc-7-C-isoNoZ.md) | **Summary**: [summary](../summaries/tc-7-C-isoNoZ.md)

## Environment

| Parameter   | Value                                                                            |
| ----------- | -------------------------------------------------------------------------------- |
| Date        | 2026-04-03                                                                       |
| Browser     | Firefox (Playwright headless)                                                    |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                                                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                                      |
| Platform    | VisualVault FormViewer                                                           |
| Test Method | Playwright regression (`timezoneId: America/Sao_Paulo`, `--project BRT-firefox`) |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-7-C-isoNoZ
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Config C control. Treated as local BRT midnight → stored as-is. GFV returns real UTC (+3h). No drift.
