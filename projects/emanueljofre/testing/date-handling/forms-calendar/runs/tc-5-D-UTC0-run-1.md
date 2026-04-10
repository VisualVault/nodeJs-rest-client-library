# TC-5-D-UTC0 — Run 1 | 2026-04-03 | UTC0 | FAIL-3

**Spec**: [tc-5-D-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-5-D-UTC0.md) | **Summary**: [summary](../summaries/tc-5-D-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Tester TZ   | Etc/GMT — UTC+0 (GMT)                       |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer, Build 20260304.1    |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                            | Result                                                                            |
| ------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                            | `"Fri Apr 03 2026 19:34:44 GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                        | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=true, ignoreTZ=true, useLegacy=false, enableInitialValue=true | `Field16` with initialDate `"2026-03-01T11:28:54.627Z"` ✓                         |

## Step Results

| Step # | Expected                                            | Actual                                            | Match    |
| ------ | --------------------------------------------------- | ------------------------------------------------- | -------- |
| 2      | Display: `03/01/2026 11:28 AM`                      | `03/01/2026` (rawLocal = `"3/1/2026"`)            | PASS     |
| 3      | Raw `.toISOString()` = `"2026-03-01T11:28:54.627Z"` | `"2026-03-01T11:28:54.627Z"` (Date object)        | PASS     |
| 4      | GFV = `"2026-03-01T11:28:54.627"` (no fake Z)       | `"2026-03-01T11:28:54.627Z"` (string, **fake Z**) | **FAIL** |
| 5      | isoRef = `"2026-03-01T00:00:00.000Z"`               | `"2026-03-01T00:00:00.000Z"`                      | PASS     |

## Outcome

**FAIL-3** — Bug #5 confirmed at UTC+0. GFV returns `"2026-03-01T11:28:54.627Z"` (fake Z). At UTC+0, `moment(value)` → local time = UTC time = `11:28:54.627`, then fake Z is appended. The numeric value is coincidentally correct (local = UTC), but the trailing Z is still structurally wrong. The shift is 0h — invisible to consumers but architecturally identical to BRT (-3h) and IST (+5:30h).

## Findings

- **Bug #5 structurally present at UTC+0 but numerically invisible.** The GFV returns `"2026-03-01T11:28:54.627Z"` — same as `raw.toISOString()`. A consumer treating Z as UTC gets the right answer ONLY because local = UTC at this timezone. At any other TZ, the same code produces wrong values.
- Round-trip stability: `SetFieldValue(GetFieldValue())` at UTC+0 is stable (0h drift per cycle) because the fake Z value happens to match real UTC. This contrasts with BRT (-3h/cycle) and IST (+5:30h/cycle).
- Matrix prediction "fake Z coincidentally correct → stable on round-trip" is confirmed for the GFV value. However, the test formally FAILS because the Expected Result specifies no Z suffix (correct behavior).
- Raw Date preserves `initialDate` exactly — consistent with all other Config D preset tests.
