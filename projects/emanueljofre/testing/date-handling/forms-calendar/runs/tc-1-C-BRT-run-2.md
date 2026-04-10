# TC-1-C-BRT — Run 2 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-1-C-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-1-C-BRT.md) | **Summary**: [summary](../summaries/tc-1-C-BRT.md)

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
| raw    | `"2026-03-15T00:00:00"` | `""2026-03-15T03:00:00.000Z""` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"not captured"`               | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #4. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-1-C-BRT
- Expected failure — Bug #4
- Test context: EXPECTED FAIL on GFV: Bug #4 — GFV applies new Date().toISOString() returning "T03:00:00.000Z". Correct: raw unchanged.
