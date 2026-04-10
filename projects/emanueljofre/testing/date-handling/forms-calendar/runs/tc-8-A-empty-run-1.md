# TC-8-A-empty — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-8-A-empty.md](tasks/date-handling/forms-calendar/test-cases/tc-8-A-empty.md) | **Summary**: [summary](../summaries/tc-8-A-empty.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                              | Result                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                              | `"Wed Apr 01 2026 12:59:51 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                          | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=false, ignoreTZ=false, useLegacy=false, enableInitialValue=false` | `["DataField7"]` ✓                                                                   |

## Step Results

| Step # | Expected                       | Actual     | Match |
| ------ | ------------------------------ | ---------- | ----- |
| 3      | `""` (raw stored value)        | `""`       | PASS  |
| 4      | `""` (GetFieldValue return)    | `""`       | PASS  |
| 5      | `"string"` (typeof)            | `"string"` | PASS  |
| 6      | `true` (strict equality to "") | `true`     | PASS  |

## Outcome

**PASS** — GetFieldValue on an empty Config A field returns `""` (empty string). Bug #6 does not affect Config A.

## Findings

- Actual matches matrix prediction: empty Config A field returns `""` as expected
- **Bug #6 confirmed as D-only** (or at least, not affecting Config A). Bug #6 conditions require `enableTime=true && ignoreTimezone=true` — Config A has `enableTime=false`, so it takes the "raw value unchanged" branch in `getCalendarFieldValue()`
- Sibling rows 8-C-empty (enableTime=true, ignoreTimezone=false) and 8-E/8-F (useLegacy=true) remain PENDING — worth testing to fully bound Bug #6's scope
- No knock-on corrections needed for sibling matrix rows
- Recommended next: run 8-C-empty to test whether enableTime=true alone (without ignoreTimezone=true) triggers Bug #6
