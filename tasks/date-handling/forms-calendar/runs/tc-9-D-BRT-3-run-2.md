# TC-9-D-BRT-3 — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-9-D-BRT-3.md](../test-cases/tc-9-D-BRT-3.md) | **Summary**: [summary](../summaries/tc-9-D-BRT-3.md)

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
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-14T15:00:00"`            | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-9-D-BRT-3
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #5 cumulative drift. 3 trips × -3h = -9h. Stored value becomes "2026-03-14T15:00:00". Crosses midnight backward.
