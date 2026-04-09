# TC-1-E-BRT — Run 3 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-1-E-BRT.md](../test-cases/tc-1-E-BRT.md) | **Summary**: [summary](../summaries/tc-1-E-BRT.md)

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

| Step # | Expected       | Actual                             | Match    |
| ------ | -------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15"` | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #2. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-1-E-BRT
- Expected failure — Bug #2
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #2 legacy popup stores UTC datetime "T03:00:00.000Z". Correct: date-only "2026-03-15".
