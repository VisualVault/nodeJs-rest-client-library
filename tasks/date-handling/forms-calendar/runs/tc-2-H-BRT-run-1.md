# TC-2-H-BRT — Run 1 | 2026-03-31 | BRT | PASS

**Spec**: [tc-2-H-BRT.md](../test-cases/tc-2-H-BRT.md) | **Summary**: [summary](../summaries/tc-2-H-BRT.md)

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
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 17:44:54 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                                |
| Field lookup | filter snippet                                              | `["DataField13"]` ✓                                                                  |

## Step Results

| Step # | Expected                       | Actual                       | Match |
| ------ | ------------------------------ | ---------------------------- | ----- |
| 4      | Display: `03/15/2026 12:00 AM` | `03/15/2026 12:00 AM`        | PASS  |
| 5      | `"2026-03-15T00:00:00"`        | `"2026-03-15T00:00:00"`      | PASS  |
| 6      | `"2026-03-15T00:00:00"`        | `"2026-03-15T00:00:00"`      | PASS  |
| 7      | `"2026-03-15T03:00:00.000Z"`   | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — All values match expected. Typed input stores local midnight without Z suffix; GetFieldValue returns raw value unchanged (useLegacy=true bypasses fake Z path).

## Findings

- Actual matches matrix prediction exactly — `"2026-03-15T00:00:00"` stored via `getSaveValue()` local time formatting
- Bug #2 confirmed: popup (tc-1-H-BRT) stores `"2026-03-15T03:00:00.000Z"` (UTC with Z), typed stores `"2026-03-15T00:00:00"` (local without Z) — same intended date, different DB representation
- `ignoreTZ` is a no-op on the typed input path: result identical to Config G (tc-2-G-BRT)
- Bug #5 absent as expected: `useLegacy=true` prevents `getCalendarFieldValue()` from adding fake Z
- Category 2 (Typed Input) now complete: 16/16 slots tested (11 PASS, 5 FAIL)
