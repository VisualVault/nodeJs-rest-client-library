# TC-12-utc-0-control — Run 3 | 2026-04-09 | UTC0 | PASS

**Spec**: [tc-12-utc-0-control.md](../test-cases/tc-12-utc-0-control.md) | **Summary**: [summary](../summaries/tc-12-utc-0-control.md)

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

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"`      | `"2026-03-15T00:00:00"`      | PASS  |
| api    | `"2026-03-15T00:00:00.000Z"` | `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Chromium produces identical results to prior runs.

## Findings

- Chromium verification for TC-12-utc-0-control
- Cross-browser consistency confirmed — chromium matches prior engine results
- Test context: Bug #5 control at UTC+0: fake Z is coincidentally correct because local midnight = UTC midnight. Zero drift — proves Bug #5 drift is proportional to TZ offset (BRT -3h, UTC 0, IST +5:30h).
