# TC-7-D-usFormatTime — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-7-D-usFormatTime.md](tasks/date-handling/forms-calendar/test-cases/tc-7-D-usFormatTime.md) | **Summary**: [summary](../summaries/tc-7-D-usFormatTime.md)

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

| Step # | Expected                | Actual                             | Match    |
| ------ | ----------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"`       | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-7-D-usFormatTime
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: US format with time parsed and normalized. GFV adds fake Z (Bug #5).
