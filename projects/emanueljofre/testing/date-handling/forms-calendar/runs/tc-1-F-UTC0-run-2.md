# TC-1-F-UTC0 — Run 2 | 2026-04-09 | UTC0 | FAIL

**Spec**: [tc-1-F-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-1-F-UTC0.md) | **Summary**: [summary](../summaries/tc-1-F-UTC0.md)

## Environment

| Parameter   | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Date        | 2026-04-09                                                           |
| Browser     | Chromium (Playwright headless)                                       |
| Tester TZ   | UTC — UTC+0 (UTC0)                                                   |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                          |
| Platform    | VisualVault FormViewer                                               |
| Test Method | Playwright regression (`timezoneId: UTC`, `--project UTC0-chromium`) |

## Step Results

| Step # | Expected       | Actual                             | Match    |
| ------ | -------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15"` | `"unknown"`                        | **FAIL** |
| api    | `"2026-03-15"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #2. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-1-F-UTC0
- Expected failure — Bug #2
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Same as E-UTC0. ignoreTZ no-op. Bug #2 format deviation.
