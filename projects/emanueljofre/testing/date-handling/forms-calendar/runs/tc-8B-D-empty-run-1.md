# TC-8B-D-empty — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-8B-D-empty.md](tasks/date-handling/forms-calendar/test-cases/tc-8B-D-empty.md) | **Summary**: [summary](../summaries/tc-8B-D-empty.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                            | Result                |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                                                            | Contains GMT-0300 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                        | `false` → V1 active ✓ |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=false, enableInitialValue=false` | `["DataField5"]` ✓    |

## Step Results

| Step # | Action / Assertion                                   | Expected      | Actual        | Match |
| ------ | ---------------------------------------------------- | ------------- | ------------- | ----- |
| 1      | getValueObjectValue("DataField5") (raw)              | `""`          | `""`          | PASS  |
| 2      | GetDateObjectFromCalendar("DataField5") return value | falsy value   | `undefined`   | PASS  |
| 3      | typeof GDOC result                                   | `"undefined"` | `"undefined"` | PASS  |
| 4      | GDOC result === undefined                            | `true`        | `true`        | PASS  |
| 5      | No throw / no error                                  | no error      | no error      | PASS  |

## Outcome

**PASS** — GetDateObjectFromCalendar on an empty Config D field returns `undefined`. No throw, no error, no null, no Invalid Date object.

## Findings

- **GDOC returns `undefined` for empty fields** — not `null`, not an Invalid Date object, not a throw. This is a falsy value, safe for developer checks like `if (gdocResult)`
- **GDOC is safer than GFV for empty Config D fields**: GFV returns `"Invalid Date"` (truthy — Bug #6), while GDOC returns `undefined` (falsy). Developers using GDOC get correct truthiness for empty-field guards
- **No Bug #6 equivalent in GDOC**: The `getDateObjectFromCalendar()` code path handles empty/missing values by returning `undefined` before reaching any date parsing logic
- This result is expected to be TZ-invariant — `undefined` return for empty fields should not depend on timezone
- Sibling 8B-C-empty, 8B-A-empty etc. are predicted to also return `undefined` since the empty guard is evaluated before config-specific branching
