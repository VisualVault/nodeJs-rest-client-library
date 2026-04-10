# TC-12-null-input — Run 1 | 2026-04-08 | BRT | FAIL

**Spec**: [tc-12-null-input.md](tasks/date-handling/forms-calendar/test-cases/tc-12-null-input.md) | **Summary**: [summary](../summaries/tc-12-null-input.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-08                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer                           |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Wed Apr 08 2026 16:01:50 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | Config D filter                                             | `["Field5"]` ✓                                                                       |

## Step Results

| Step # | Expected | Actual           | Match    |
| ------ | -------- | ---------------- | -------- |
| 3      | `""`     | `""`             | PASS     |
| 4      | `""`     | `"Invalid Date"` | **FAIL** |

## Outcome

**FAIL** — FAIL-1 (Bug #6 — Invalid Date from null). `SetFieldValue('Field5', null)` normalizes to empty string internally. `GetFieldValue()` then returns `"Invalid Date"` via `moment("").format()` — identical behavior to `""` input in tc-12-empty-value.

## Findings

- Confirmed: `null` input triggers same Bug #6 path as `""` — SetFieldValue normalizes both to empty, then GFV produces `"Invalid Date"`
- Bug #6 confirmed: `null` is NOT distinct from `""` for Config D empty-field behavior
- No new bug — this is the same FORM-BUG-6 mechanism as tc-12-empty-value
- Sibling tc-12-empty-value (Run 1, 2026-04-03) showed identical result
