# TC-9-D-UTC0 — Run 2 | 2026-04-09 | UTC0 | FAIL

**Spec**: [tc-9-D-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-9-D-UTC0.md) | **Summary**: [summary](../summaries/tc-9-D-UTC0.md)

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

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-9-D-UTC0
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: Bug #5 present but 0 drift at UTC+0 — fake Z coincidentally correct. PASS for round-trip (no value change).
