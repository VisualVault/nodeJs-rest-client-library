# TC-8B-D-BRT — Run 1 | 2026-04-01 | BRT | PASS + FAIL-1

**Spec**: [tc-8B-D-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8B-D-BRT.md) | **Summary**: [summary](../summaries/tc-8B-D-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                            | Result                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                            | `"Wed Apr 01 2026 13:11:22 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                        | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=false, enableInitialValue=false` | `["DataField5"]` ✓                                                                   |

## Step Results

| Step # | Expected                                        | Actual                                                         | Match      |
| ------ | ----------------------------------------------- | -------------------------------------------------------------- | ---------- |
| 3      | `"2026-03-15T00:00:00"` (raw)                   | `"2026-03-15T00:00:00"`                                        | PASS       |
| 5      | `true` (instanceof Date)                        | `true`                                                         | PASS       |
| 6      | contains `Mar 15 2026 00:00:00 GMT-0300`        | `"Sun Mar 15 2026 00:00:00 GMT-0300 (Brasilia Standard Time)"` | PASS       |
| 7      | `"2026-03-15T03:00:00.000Z"` (GDOC toISOString) | `"2026-03-15T03:00:00.000Z"`                                   | PASS       |
| 8      | `"2026-03-15T00:00:00"` (GFV — correct)         | `"2026-03-15T00:00:00.000Z"` (fake Z — Bug #5)                 | **FAIL-1** |
| 9      | `"2026-03-15T03:00:00.000Z"` (TZ ref)           | `"2026-03-15T03:00:00.000Z"`                                   | PASS       |

## Outcome

**PASS + FAIL-1** — GetDateObjectFromCalendar returns a correct Date object (all GDOC assertions pass). GetFieldValue comparison confirms Bug #5 (fake Z): GFV returns `"2026-03-15T00:00:00.000Z"` while GDOC.toISOString() returns `"2026-03-15T03:00:00.000Z"` — a 3h discrepancy proving the Z in GFV is not genuine UTC.

## Findings

- **GDOC behavior matches matrix prediction exactly**: Date object toString shows `Mar 15 2026 00:00:00 GMT-0300`, toISOString returns `"2026-03-15T03:00:00.000Z"` (real UTC = BRT midnight + 3h)
- **Bug #5 re-confirmed via comparison**: GFV returns `"2026-03-15T00:00:00.000Z"` (fake Z — local midnight mislabeled as UTC), GDOC.toISOString() returns `"2026-03-15T03:00:00.000Z"` (real UTC). The 3h gap proves the GFV Z suffix is fake.
- **Key developer implication**: A developer using `GetDateObjectFromCalendar().toISOString()` gets correct UTC; using `GetFieldValue()` gets wrong UTC (3h off in BRT). If the GDOC ISO string is passed back to SetFieldValue, it would store `T03:00:00` (correct UTC) rather than `T00:00:00` — but the form would then show 3:00 AM instead of midnight, creating a visible mismatch.
- No knock-on corrections needed for sibling matrix rows
- Recommended next: run 8B-D-IST to verify GDOC in UTC+ timezone (IST should show real UTC = midnight IST - 5.5h = previous day UTC)
