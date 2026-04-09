# TC-12-year-boundary — Run 2 | 2026-04-09 | BRT | FAIL

**Spec**: [tc-12-year-boundary.md](../test-cases/tc-12-year-boundary.md) | **Summary**: [summary](../summaries/tc-12-year-boundary.md)

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
| raw    | `"2026-01-01T00:00:00"` | `"2025-12-31T21:00:00"`            | **FAIL** |
| api    | `"2026-01-01T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-12-year-boundary
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Year boundary crossed in single trip! Jan 1 2026 midnight -3h = Dec 31 2025 21:00. Most dramatic Bug #5 consequence.
