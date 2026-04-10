# TC-8-C-empty — Run 2 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-8-C-empty.md](tasks/date-handling/forms-calendar/test-cases/tc-8-C-empty.md) | **Summary**: [summary](../summaries/tc-8-C-empty.md)

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

| Step # | Expected | Actual                    | Match    |
| ------ | -------- | ------------------------- | -------- |
| raw    | `""`     | `""ERROR: invalid date""` | **FAIL** |
| api    | `""`     | `"not captured"`          | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #6. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-8-C-empty
- Expected failure — Bug #6
- Test context: EXPECTED FAIL: Bug #6 variant — GFV THROWS RangeError instead of returning "". Correct: empty string. new Date("").toISOString() throws.
