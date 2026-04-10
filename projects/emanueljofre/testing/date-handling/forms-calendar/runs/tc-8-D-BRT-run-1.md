# TC-8-D-BRT — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-8-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8-D-BRT.md) | **Summary**: [summary](../summaries/tc-8-D-BRT.md)

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

| Step # | Expected                | Actual                         | Match    |
| ------ | ----------------------- | ------------------------------ | -------- |
| raw    | `"2026-03-15T00:00:00"` | `""2026-03-15T00:00:00.000Z""` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"not captured"`               | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-8-D-BRT
- Expected failure — Bug #5
- Test context: EXPECTED FAIL: Bug #5 GFV adds fake Z → returns "2026-03-15T00:00:00.000Z". Correct behavior: raw value without transformation.
