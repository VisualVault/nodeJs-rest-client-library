# TC-12-leap-day — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-12-leap-day.md](../test-cases/tc-12-leap-day.md) | **Summary**: [summary](../summaries/tc-12-leap-day.md)

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
| raw    | `"2028-02-29T00:00:00"` | `"2028-02-28T21:00:00"`            | **FAIL** |
| api    | `"2028-02-29T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-12-leap-day
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Leap day lost in single trip! Feb 29 midnight -3h = Feb 28 21:00. Single round-trip permanently corrupts leap day data.
