# TC-4-D-z-BRT — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-4-D-z-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-4-D-z-BRT.md) | **Summary**: [summary](../summaries/tc-4-D-z-BRT.md)

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

| Step # | Expected                     | Actual                             | Match    |
| ------ | ---------------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T11:30:00"`      | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15T11:30:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #1, Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-D-z-BRT
- Expected failure — Bug #1, Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: FORM-BUG-1: Z stripped → local parse shifts -3h. FORM-BUG-5: API appends fake Z to the wrong time. UTC 14:30 becomes BRT 11:30 in both raw and API.
