# TC-8-D-empty-IST — Run 1 | 2026-04-01 | IST | FAIL

**Spec**: [tc-8-D-empty-IST.md](../test-cases/tc-8-D-empty-IST.md) | **Summary**: [summary](../summaries/tc-8-D-empty-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-01                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains GMT+0530 ✓   |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | filter by config flags                                      | `["DataField5"]` ✓    |

## Step Results

| Step # | Expected                  | Actual           | Match    |
| ------ | ------------------------- | ---------------- | -------- |
| 1      | `""` (GFV on empty field) | `"Invalid Date"` | **FAIL** |

## Outcome

**FAIL** — Bug #6 confirmed as TZ-independent. GetFieldValue on an empty Config D field returns `"Invalid Date"` in IST, identical to BRT behavior.

## Findings

- Bug #6 fires in IST exactly as in BRT — the bug is not timezone-dependent
- `"Invalid Date"` is truthy, so `if (VV.Form.GetFieldValue('DataField5'))` evaluates `true` for an empty field regardless of timezone
- Confirms Bug #6 scope: `enableTime=true && ignoreTimezone=true && useLegacy=false` — the condition is config-dependent, not TZ-dependent
