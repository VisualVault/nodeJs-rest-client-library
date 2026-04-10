# TC-12-utc-0-control — Run 2 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-12-utc-0-control.md](tasks/date-handling/forms-calendar/test-cases/tc-12-utc-0-control.md) | **Summary**: [summary](../summaries/tc-12-utc-0-control.md)

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

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Firefox produces identical results to prior runs.

## Findings

- Firefox verification for TC-12-utc-0-control
- Cross-browser consistency confirmed — firefox matches prior engine results
- Test context: Bug #5 control at UTC+0: fake Z is coincidentally correct because local midnight = UTC midnight. Zero drift — proves Bug #5 drift is proportional to TZ offset (BRT -3h, UTC 0, IST +5:30h).
