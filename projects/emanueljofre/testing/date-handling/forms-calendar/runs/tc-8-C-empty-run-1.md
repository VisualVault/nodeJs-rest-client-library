# TC-8-C-empty — Run 1 | 2026-04-01 | BRT | FAIL-1

**Spec**: [tc-8-C-empty.md](tasks/date-handling/forms-calendar/test-cases/tc-8-C-empty.md) | **Summary**: [summary](../summaries/tc-8-C-empty.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                             | Result                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                             | `"Wed Apr 01 2026 14:46:27 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                         | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=false, useLegacy=false, enableInitialValue=false` | `["DataField6"]` ✓                                                                   |

## Step Results

| Step # | Expected                    | Actual                                  | Match      |
| ------ | --------------------------- | --------------------------------------- | ---------- |
| 3      | `""` (raw stored value)     | `""`                                    | PASS       |
| 4      | `""` (GetFieldValue return) | THROWS `RangeError: Invalid time value` | **FAIL-1** |
| 5      | `"string"` (typeof)         | N/A (throws before return)              | **FAIL-1** |

## Outcome

**FAIL-1** — GetFieldValue on empty Config C field **throws `RangeError: Invalid time value`** instead of returning `""`. The `getCalendarFieldValue()` code path for `ignoreTimezone=false` calls `new Date("").toISOString()` which throws because `new Date("")` is Invalid Date.

## Findings

- **New bug variant discovered**: Config C empty-field behavior is **worse than Bug #6**. Bug #6 (Config D) returns the string `"Invalid Date"` — truthy but non-crashing. Config C **throws a RangeError** — any developer script calling `GetFieldValue()` on an empty Config C field without try/catch will crash
- **Root cause shared with Bug #6**: Both are missing an empty-value guard in `getCalendarFieldValue()`. Config D takes the `moment("").format(...)` branch (returns string), Config C takes the `new Date("").toISOString()` branch (throws)
- **Bug scope expansion**: Bug #6 is not limited to `ignoreTimezone=true` configs. All `enableTime=true && !useLegacy` configs are affected — Config C (throws) and Config D (returns "Invalid Date"). Only Config A (enableTime=false, returns raw value) is safe
- **Sibling predictions updated**: 8-G-empty and 8-H-empty (useLegacy=true) should still be safe since useLegacy bypasses the entire enableTime block
- Recommended next: update Bug #6 analysis scope to include Config C throw variant. Run 8-H-empty to confirm useLegacy=true prevents both variants
