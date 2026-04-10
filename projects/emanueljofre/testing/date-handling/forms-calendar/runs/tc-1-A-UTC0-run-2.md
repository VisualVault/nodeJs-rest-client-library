# TC-1-A-UTC0 — Run 2 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-1-A-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-1-A-UTC0.md) | **Summary**: [summary](../summaries/tc-1-A-UTC0.md)

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

| Step # | Expected       | Actual         | Match |
| ------ | -------------- | -------------- | ----- |
| raw    | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| api    | `"2026-03-15"` | `"2026-03-15"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-1-A-UTC0
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: UTC+0 control. Date-only baseline. No TZ shift (UTC+0 midnight = UTC midnight).
