# TC-5-D-BRT — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-5-D-BRT.md](../test-cases/tc-5-D-BRT.md) | **Summary**: [summary](../summaries/tc-5-D-BRT.md)

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
| raw    | `"2026-03-01T00:00:00"` | `"2026-03-01T11:28:54.627Z"`       | **FAIL** |
| api    | `"2026-03-01T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-5-D-BRT
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #5 fires on preset Date at form load in BRT. Raw = Date object (initialDate preserved as "2026-03-01T11:28:54.627Z"). GFV returns BRT local time with fake Z ("2026-03-01T08:28:54.627Z" — shifted -3h). Config D preset fields corrupted before any user interaction.
