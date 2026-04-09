# TC-2-C-BRT — Run 3 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-2-C-BRT.md](../test-cases/tc-2-C-BRT.md) | **Summary**: [summary](../summaries/tc-2-C-BRT.md)

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
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T03:00:00.000Z"`       | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #4. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-2-C-BRT
- Expected failure — Bug #4
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL on GFV: Bug #4 applies toISOString → "T03:00:00.000Z". Correct: raw unchanged.
