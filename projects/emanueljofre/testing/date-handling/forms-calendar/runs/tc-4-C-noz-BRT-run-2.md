# TC-4-C-noz-BRT — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-4-C-noz-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-4-C-noz-BRT.md) | **Summary**: [summary](../summaries/tc-4-C-noz-BRT.md)

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
| raw    | `"2026-03-15T14:30:00"`      | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15T17:30:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — No bugs triggered. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-C-noz-BRT
- Expected failure — assertion mismatch
- API value not captured — test stopped at raw value assertion failure
- Test context: Config C without Z. Treated as local 14:30 BRT. Raw preserves local time. API returns UTC equivalent (+3h).
