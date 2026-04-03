# TC-1-D-UTC0 — Run 2 | 2026-04-03 | UTC0 | FAIL

**Spec**: [tc-1-D-UTC0.md](../test-cases/tc-1-D-UTC0.md) | **Summary**: [summary](../summaries/tc-1-D-UTC0.md)

## Environment

| Parameter   | Value                                                               |
| ----------- | ------------------------------------------------------------------- |
| Date        | 2026-04-03                                                          |
| Browser     | Firefox (Playwright headless)                                       |
| Tester TZ   | UTC — UTC+0 (UTC0)                                                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)                         |
| Platform    | VisualVault FormViewer                                              |
| Test Method | Playwright regression (`timezoneId: UTC`, `--project UTC0-firefox`) |

## Step Results

| Step # | Expected                | Actual                       | Match    |
| ------ | ----------------------- | ---------------------------- | -------- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00.000Z"` | **FAIL** |
| api    | `"2026-03-15T00:00:00"` | `"not captured"`             | **FAIL** |

## Outcome

**FAIL** — Bugs: Bug #5. See TC spec for fail condition details.

## Findings

- Firefox verification for TC-1-D-UTC0
- Expected failure — Bug #5
- Test context: EXPECTED FAIL on GFV: Bug #5 fake Z — "...000Z" suffix added. Value coincidentally correct at UTC+0 but format wrong.
