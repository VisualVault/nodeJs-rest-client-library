# TC-12-empty-value — Run 1 | 2026-04-03 | BRT | FAIL

**Spec**: [tc-12-empty-value.md](../test-cases/tc-12-empty-value.md) | **Summary**: [summary](../summaries/tc-12-empty-value.md)

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

| Step # | Expected | Actual             | Match    |
| ------ | -------- | ------------------ | -------- |
| raw    | `""`     | `""Invalid Date""` | **FAIL** |
| api    | `""`     | `"not captured"`   | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #6. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-12-empty-value
- Expected failure — Bug #6
- Test context: EXPECTED FAIL: Bug #6 GFV returns "Invalid Date" for empty Config D field. moment("").format() → truthy string breaking if(GFV()) guards.
