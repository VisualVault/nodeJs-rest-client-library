# TC-6-D-BRT — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-6-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-6-D-BRT.md) | **Summary**: [summary](../summaries/tc-6-D-BRT.md)

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

| Step # | Expected | Actual                             | Match    |
| ------ | -------- | ---------------------------------- | -------- |
| raw    | `""`     | `"2026-04-09T19:29:22.617Z"`       | **FAIL** |
| api    | `""`     | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-6-D-BRT
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #5 fires on Current Date at form load in BRT. Raw = correct Date (new Date() → UTC). GFV returns BRT local time with fake Z (-3h shift). Same behavior as 5-D-BRT (preset) and 6-D-IST (+5:30h).
