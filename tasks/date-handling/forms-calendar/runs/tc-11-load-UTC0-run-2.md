# TC-11-load-UTC0 — Run 2 | 2026-04-09 | UTC0 | FAIL

**Spec**: [tc-11-load-UTC0.md](../test-cases/tc-11-load-UTC0.md) | **Summary**: [summary](../summaries/tc-11-load-UTC0.md)

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

| Step # | Expected                | Actual                             | Match    |
| ------ | ----------------------- | ---------------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"`       | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — No bugs triggered. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-11-load-UTC0
- Expected failure — assertion mismatch
- API value not captured — test stopped at raw value assertion failure
- Test context: Bug #5 fake Z present but coincidentally correct at UTC+0 (local=UTC). 0 drift — masks the bug. Any non-zero TZ reveals drift.
