# TC-8-H-empty — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-8-H-empty.md](tasks/date-handling/forms-calendar/test-cases/tc-8-H-empty.md) | **Summary**: [summary](../summaries/tc-8-H-empty.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                           | Result                |
| ------------ | ------------------------------------------------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                                                           | Contains GMT-0300 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                       | `false` → V1 active ✓ |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=true, enableInitialValue=false` | `["DataField13"]` ✓   |

## Step Results

| Step # | Action / Assertion                       | Expected   | Actual     | Match |
| ------ | ---------------------------------------- | ---------- | ---------- | ----- |
| 1      | getValueObjectValue("DataField13") (raw) | `""`       | `""`       | PASS  |
| 2      | GetFieldValue("DataField13") (GFV)       | `""`       | `""`       | PASS  |
| 3      | typeof GFV result                        | `"string"` | `"string"` | PASS  |
| 4      | GFV === "" (strict empty)                | `true`     | `true`     | PASS  |

## Outcome

**PASS** — GetFieldValue on an empty Config H field returns `""` (strict empty string). `useLegacy=true` prevents Bug #6.

## Findings

- **Bug #6 confirmed as non-legacy only**: Config H (`useLegacy=true`, `enableTime=true`, `ignoreTimezone=true`) returns `""` for empty fields — safe. This contrasts with Config D (same flags except `useLegacy=false`) which returns `"Invalid Date"` (Bug #6) and Config C (`ignoreTimezone=false`, `useLegacy=false`) which throws `RangeError`
- `useLegacy=true` bypasses the entire `enableTime` transformation block in `getCalendarFieldValue()`, returning the raw value directly — same protective mechanism as for Bug #5
- **Bug #6 scope fully bounded**: affects only `enableTime=true && !useLegacy` configs (C and D). All legacy configs (E–H) and date-only configs (A, B) are immune
- Sibling 8-G-empty (`useLegacy=true`, `ignoreTimezone=false`) should behave identically — useLegacy guard is evaluated before ignoreTimezone
