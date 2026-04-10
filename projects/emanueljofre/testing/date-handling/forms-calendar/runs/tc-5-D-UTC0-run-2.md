# TC-5-D-UTC0 — Run 2 | 2026-04-09 | UTC0 | FAIL

**Spec**: [tc-5-D-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-5-D-UTC0.md) | **Summary**: [summary](../summaries/tc-5-D-UTC0.md)

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
| raw    | `"2026-03-01T00:00:00"` | `"2026-03-01T11:28:54.627Z"`       | **FAIL** |
| api    | `"2026-03-01T00:00:00"` | `"(test halted at raw assertion)"` | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Chromium verification for TC-5-D-UTC0
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL: Bug #5 at UTC+0. GFV returns "2026-03-01T11:28:54.627Z" (fake Z). Value is numerically correct (local=UTC) but Z is structurally wrong. Round-trip stable (0h drift). Bug #5 invisible at UTC+0 but architecturally present.
