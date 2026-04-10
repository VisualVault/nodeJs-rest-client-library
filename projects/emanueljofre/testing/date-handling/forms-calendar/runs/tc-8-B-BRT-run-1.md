# TC-8-B-BRT — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-8-B-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-8-B-BRT.md) | **Summary**: [summary](../summaries/tc-8-B-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                             | Result                |
| ------------ | --------------------------------------------------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                                                             | Contains GMT-0300 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                         | `false` → V1 active ✓ |
| Field lookup | filter `fieldType===13, enableTime=false, ignoreTZ=true, useLegacy=false, enableInitialValue=false` | `["DataField10"]` ✓   |

## Step Results

| Step # | Action / Assertion                        | Expected       | Actual         | Match |
| ------ | ----------------------------------------- | -------------- | -------------- | ----- |
| 1      | SetFieldValue("DataField10","2026-03-15") | value set      | value set      | PASS  |
| 2      | getValueObjectValue("DataField10") (raw)  | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| 3      | GetFieldValue("DataField10") (GFV)        | `"2026-03-15"` | `"2026-03-15"` | PASS  |
| 4      | GFV === raw                               | `true`         | `true`         | PASS  |

## Outcome

**PASS** — GetFieldValue on Config B returns the raw stored value unchanged (`"2026-03-15"`). No transformation, no fake Z, no drift.

## Findings

- ignoreTZ has no effect on date-only GFV — Config B (`ignoreTZ=true`) behaves identically to Config A (`ignoreTZ=false`) for GetFieldValue return
- The `getCalendarFieldValue()` code path for `enableTime=false` returns the raw value directly, bypassing the Bug #5 / Bug #6 transformation logic
- No bugs. Date-only configs (A, B, E, F) are safe from GFV output bugs regardless of ignoreTZ setting
- Sibling 8-B-IST and 8-B-UTC0 should produce identical results since the raw value is returned as-is
