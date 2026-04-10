# TC-9-GDOC-D-IST-1 — Run 1 | 2026-04-01 | IST | PASS

**Spec**: [tc-9-GDOC-D-IST-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-GDOC-D-IST-1.md) | **Summary**: [summary](../summaries/tc-9-GDOC-D-IST-1.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT+0530 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | filter by config flags                                      | `["DataField5"]` ✓    |

## Step Results

| Step # | Expected                                          | Actual                                  | Match |
| ------ | ------------------------------------------------- | --------------------------------------- | ----- |
| 1      | SFV sets raw to `"2026-03-15T00:00:00"`           | pre raw = `"2026-03-15T00:00:00"`       | PASS  |
| 2      | GDOC.toISOString() = `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"`            | PASS  |
| 3      | SFV(GDOC.toISOString()) stores without drift      | post raw = `"2026-03-15T00:00:00"`      | PASS  |
| 4      | GFV after round-trip                              | post api = `"2026-03-15T00:00:00.000Z"` | PASS  |

## Outcome

**PASS** — 0 drift after 1 GDOC round-trip. Matrix prediction of +5:30h drift was WRONG — GDOC round-trip is stable in IST.

## Findings

- **Matrix prediction corrected**: The matrix predicted +5:30h drift for GDOC round-trip in IST, but the actual result is 0 drift. The GDOC ISO string (`"2026-03-14T18:30:00.000Z"`) is parsed by SFV as real UTC midnight on March 14 → in IST that is March 15 00:00 → stored as `"2026-03-15T00:00:00"` — the original value. The round-trip is self-correcting.
- **Matches BRT GDOC round-trip stability**: In BRT, GDOC round-trip was also stable (tc-9-GDOC-D-BRT-1). The mechanism is the same: SFV parses the real UTC ISO string and converts to local, which reconstructs the original local time.
- **GDOC round-trip universally stable**: Confirmed across UTC- (BRT) and UTC+ (IST). Unlike GFV round-trip (which drifts due to fake Z), GDOC produces real UTC that SFV correctly interprets.
- **GDOC is the safe API for round-trips**: Developers should use `GetDateObjectFromCalendar().toISOString()` instead of `GetFieldValue()` for Config D DateTime fields if they need to read and re-write values.
