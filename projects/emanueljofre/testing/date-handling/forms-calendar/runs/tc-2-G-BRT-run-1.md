# TC-2-G-BRT — Run 1 | 2026-03-31 | BRT | PASS

**Spec**: [tc-2-G-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-2-G-BRT.md) | **Summary**: [summary](../summaries/tc-2-G-BRT.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | America/Sao_Paulo — UTC-3 (BRT)             |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                               |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 17:12:02 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField14"]` ✓                                                                  |

## Step Results

| Step # | Expected                          | Actual                            | Match |
| ------ | --------------------------------- | --------------------------------- | ----- |
| 4      | `"03/15/2026 12:00 AM"` (display) | `"03/15/2026 12:00 AM"` (display) | PASS  |
| 5      | `"2026-03-15T00:00:00"`           | `"2026-03-15T00:00:00"`           | PASS  |
| 6      | `"2026-03-15T00:00:00"`           | `"2026-03-15T00:00:00"`           | PASS  |
| 7      | `"2026-03-15T03:00:00.000Z"`      | `"2026-03-15T03:00:00.000Z"`      | PASS  |

## Outcome

**PASS** — Raw stored value and GetFieldValue both return `"2026-03-15T00:00:00"` (local midnight, no Z). Typed input correctly processed through `getSaveValue()`.

## Findings

- Actual matches matrix prediction `"2026-03-15T00:00:00"` — correct behavior for typed input through `getSaveValue()` path
- Bug #2 confirmed: popup (tc-1-G-BRT) stores `"2026-03-15T03:00:00.000Z"` (raw UTC ISO with Z), typed input stores `"2026-03-15T00:00:00"` (local time, no Z) — structurally different storage for the same intended date
- Bug #4 is active on this path: `getSaveValue()` formats as `moment().format("YYYY-MM-DD[T]HH:mm:ss")` which strips Z and outputs local time
- GetFieldValue returns raw value unchanged — `useLegacy=true` causes `getCalendarFieldValue()` to fall through without transformation (no Bug #5 risk)
- Consistent with tc-2-G-IST (same local midnight storage `"2026-03-15T00:00:00"` regardless of TZ — `getSaveValue()` always formats local time)
- Sibling 2-H-BRT expected to produce identical result (ignoreTZ is no-op on typed input path)
