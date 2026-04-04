# TC-7-A-usFormat — Run 1 | 2026-04-03 | BRT | PASS

**Spec**: [tc-7-A-usFormat.md](../test-cases/tc-7-A-usFormat.md) | **Summary**: [summary](../summaries/tc-7-A-usFormat.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-03                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Fri Apr 03 2026 19:25:04 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["Field7"]` ✓                                                                       |

## Step Results

| Step # | Expected                     | Actual                       | Match |
| ------ | ---------------------------- | ---------------------------- | ----- |
| raw    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| api    | `"2026-03-15"`               | `"2026-03-15"`               | PASS  |
| isoRef | `"2026-03-15T03:00:00.000Z"` | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — US date format `"03/15/2026"` parsed correctly by `moment()` as local midnight March 15. Date stored as-is.

## Findings

- US format (`MM/dd/yyyy`) is the native VV display format — moment parses it as local time.
- Matches all other Config A BRT format variants — format-agnostic behavior confirmed.
- In UTC+ timezones, this format would trigger Bug #7 (local midnight → previous UTC day).
