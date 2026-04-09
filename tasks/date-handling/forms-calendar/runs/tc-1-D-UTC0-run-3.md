# TC-1-D-UTC0 — Run 3 | 2026-04-09 | UTC0 | FAIL

**Spec**: [tc-1-D-UTC0.md](../test-cases/tc-1-D-UTC0.md) | **Summary**: [summary](../summaries/tc-1-D-UTC0.md)

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

- Chromium verification for TC-1-D-UTC0
- Expected failure — Bug #5
- API value not captured — test stopped at raw value assertion failure
- Test context: EXPECTED FAIL on GFV: Bug #5 fake Z — "...000Z" suffix added. Value coincidentally correct at UTC+0 but format wrong.
