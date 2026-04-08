# TC-12-empty-Config-C — Run 1 | 2026-04-08 | BRT | FAIL

**Spec**: [tc-12-empty-Config-C.md](../test-cases/tc-12-empty-Config-C.md) | **Summary**: [summary](../summaries/tc-12-empty-Config-C.md)

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
| Field lookup | Config C filter                                             | `["Field6"]` ✓                                                                       |

## Step Results

| Step # | Expected | Actual                                    | Match    |
| ------ | -------- | ----------------------------------------- | -------- |
| 2      | `""`     | `""`                                      | PASS     |
| 3      | `""`     | `RangeError: Invalid time value` (thrown) | **FAIL** |

## Outcome

**FAIL** — FAIL-1 (Bug #6 — RangeError thrown). `GetFieldValue('Field6')` on empty Config C field throws `RangeError: Invalid time value` because `getCalendarFieldValue()` calls `new Date("").toISOString()` — `new Date("")` produces Invalid Date, and `.toISOString()` throws.

## Findings

- Confirmed: Bug #6 affects Config C with a different failure mode than Config D
    - Config C (`ignoreTimezone=false`): `new Date("").toISOString()` → **RangeError thrown** (crashes caller)
    - Config D (`ignoreTimezone=true`): `moment("").format(...)` → **`"Invalid Date"` string** (truthy, silent corruption)
- Both are FORM-BUG-6 but the Config C variant is arguably worse — it's an unhandled exception
- Matches Cat 8 sibling tc-8-C-empty (also FAIL with RangeError)
- Bug #6 scope fully mapped: C (throws), D (truthy string), A/B/E/F/G/H (immune)
