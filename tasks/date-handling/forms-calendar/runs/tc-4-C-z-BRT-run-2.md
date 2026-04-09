# TC-4-C-z-BRT — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-4-C-z-BRT.md](../test-cases/tc-4-C-z-BRT.md) | **Summary**: [summary](../summaries/tc-4-C-z-BRT.md)

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
| api    | `"2026-03-15T14:30:00.000Z"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #1. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-4-C-z-BRT
- Expected failure — Bug #1
- API value not captured — test stopped at raw value assertion failure
- Test context: Config C with Z. Raw shifts -3h (Z stripped, re-parsed as local). API recovers correct UTC via toISOString(). FORM-BUG-1 on raw, but API correct.
