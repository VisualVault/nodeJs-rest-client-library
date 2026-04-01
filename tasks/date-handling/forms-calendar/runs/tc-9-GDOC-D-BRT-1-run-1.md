# TC-9-GDOC-D-BRT-1 — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-9-GDOC-D-BRT-1.md](../test-cases/tc-9-GDOC-D-BRT-1.md) | **Summary**: [summary](../summaries/tc-9-GDOC-D-BRT-1.md)

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
| TZ           | `new Date().toString()`                                                                            | `"Wed Apr 01 2026 14:53:10 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                        | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=false, enableInitialValue=false` | `["DataField5"]` ✓                                                                   |

## Step Results

| Step # | Expected                                          | Actual                                       | Match |
| ------ | ------------------------------------------------- | -------------------------------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"` (baseline raw)            | `"2026-03-15T00:00:00"`                      | PASS  |
| 4      | `"2026-03-15T03:00:00.000Z"` (GDOC ISO)           | `"2026-03-15T03:00:00.000Z"`                 | PASS  |
| 6      | `"2026-03-15T00:00:00"` (post-trip raw)           | `"2026-03-15T00:00:00"`                      | PASS  |
| 7      | `"2026-03-15T00:00:00"` (post-trip GFV — correct) | `"2026-03-15T00:00:00.000Z"` (Bug #5 fake Z) | N/A   |
| 8      | `"2026-03-15T03:00:00.000Z"` (TZ ref)             | `"2026-03-15T03:00:00.000Z"`                 | PASS  |

## Outcome

**PASS** — Zero drift after 1 GDOC round-trip. The real UTC string `"2026-03-15T03:00:00.000Z"` is correctly parsed by `normalizeCalValue` back to BRT midnight `"2026-03-15T00:00:00"`. Matrix prediction of -3h shift was wrong.

## Findings

- **Matrix prediction corrected**: Expected -3h shift, actual is 0 shift. The GDOC round-trip is STABLE in BRT
- **Why GDOC round-trip is safe but GFV round-trip drifts**: Both go through `normalizeCalValue()` which calls `moment(input).toDate()`. The difference is the Z suffix:
    - GDOC: `"2026-03-15T03:00:00.000Z"` → moment parses as UTC 03:00 → Date = BRT midnight → getSaveValue extracts local = `"T00:00:00"` → **correct**
    - GFV (Bug #5): `"2026-03-15T00:00:00.000Z"` → moment parses as UTC midnight → Date = Mar 14 21:00 BRT → getSaveValue = `"T21:00:00"` → **-3h drift**
- **Developer implication**: `SetFieldValue(field, GetDateObjectFromCalendar(field).toISOString())` is a SAFE round-trip for Config D in BRT. `SetFieldValue(field, GetFieldValue(field))` is NOT safe (drifts -3h/trip). Developers should prefer GDOC over GFV for Config D
- Step 7 (GFV) still shows Bug #5 fake Z (`"...000Z"`) but this doesn't affect the round-trip since the raw value is correct
- **Sibling predictions updated**: 9-GDOC-C-BRT-1 should also be 0 drift (Config C uses real UTC in GFV too). 9-GDOC-D-IST-1 needs testing — IST might behave differently
- Recommended next: run 9-GDOC-D-IST-1 to verify GDOC round-trip stability in UTC+ timezone
