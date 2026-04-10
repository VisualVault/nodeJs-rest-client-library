# TC-11-roundtrip-cross — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-11-roundtrip-cross.md](tasks/date-handling/forms-calendar/test-cases/tc-11-roundtrip-cross.md) | **Summary**: [summary](../summaries/tc-11-roundtrip-cross.md)

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
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-14T21:00:00"`            | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-11-roundtrip-cross
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Compound cross-TZ drift. IST round-trip +5:30h → BRT round-trip -3h → net +2:30h from midnight. Each TZ user applies their offset via Bug #5 fake Z. Worst-case multi-user scenario.
