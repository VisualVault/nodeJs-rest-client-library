# TC-3-F-BRT-BRT — Run 1 | 2026-04-02 | BRT | PASS

**Spec**: [tc-3-F-BRT-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-F-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-F-BRT-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-02                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                            | Result                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                            | `"Thu Apr 02 2026 10:37:45 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                        | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=false, ignoreTZ=true, useLegacy=true, enableInitialValue=false` | `["DataField11"]` ✓                                                                  |

## Step Results

| Step # | Expected                              | Actual                       | Match |
| ------ | ------------------------------------- | ---------------------------- | ----- |
| 2      | `"2026-03-15"` (raw after reload)     | `"2026-03-15"`               | PASS  |
| 3      | `"2026-03-15"` (GFV after reload)     | `"2026-03-15"`               | PASS  |
| 4      | `true` (GFV === raw)                  | `true`                       | PASS  |
| 5      | `"2026-03-15T03:00:00.000Z"` (TZ ref) | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config F legacy date-only + ignoreTZ value survives same-TZ (BRT→BRT) save/reload cycle intact. Raw stored value `"2026-03-15"` is unchanged after reload. GFV returns raw value without transformation.

## Findings

- Actual matches matrix prediction: "No shift — same as E-BRT-BRT (ignoreTZ no effect on date-only)"
- **`ignoreTimezone=true` is inert for date-only fields on the reload path** — Config F behaves identically to Config E
- Pre-save raw: `"2026-03-15"` → post-reload raw: `"2026-03-15"` — zero drift
- GFV returns raw unchanged (legacy path, same as Config E)
- Record: DateTest-000471 Rev 1 (cat3-EF-BRT), verified DataField11
- Recommended next: run 3-F-BRT-IST (cross-TZ) to verify ignoreTZ remains inert for date-only in cross-TZ reload
