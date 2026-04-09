# TC-1-A-UTC0 — Run 3 | 2026-04-09 | UTC0 | FAIL

**Spec**: [tc-1-A-UTC0.md](../test-cases/tc-1-A-UTC0.md) | **Summary**: [summary](../summaries/tc-1-A-UTC0.md)

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

**FAIL** — No bugs triggered. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-1-A-UTC0
- Expected failure — assertion mismatch
- API value not captured — test stopped at raw value assertion failure
- Test context: UTC+0 control. Date-only baseline. No TZ shift (UTC+0 midnight = UTC midnight).
