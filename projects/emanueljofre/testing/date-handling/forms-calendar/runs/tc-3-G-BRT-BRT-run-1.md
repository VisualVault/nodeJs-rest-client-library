# TC-3-G-BRT-BRT — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-3-G-BRT-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-G-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-G-BRT-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                            | Result                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                            | `"Wed Apr 01 2026 14:25:37 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                        | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=false, useLegacy=true, enableInitialValue=false` | `["DataField14"]` ✓                                                                  |

## Step Results

| Step # | Expected                                   | Actual                       | Match |
| ------ | ------------------------------------------ | ---------------------------- | ----- |
| 2      | `"2026-03-15T00:00:00"` (raw after reload) | `"2026-03-15T00:00:00"`      | PASS  |
| 3      | `"2026-03-15T00:00:00"` (GFV after reload) | `"2026-03-15T00:00:00"`      | PASS  |
| 4      | `true` (GFV === raw)                       | `true`                       | PASS  |
| 5      | `"2026-03-15T03:00:00.000Z"` (TZ ref)      | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config G legacy DateTime value survives same-TZ (BRT→BRT) save/reload cycle intact. Raw stored value `"2026-03-15T00:00:00"` is unchanged after reload. GFV returns raw value without transformation (legacy path bypasses fake-Z and toISOString branches).

## Findings

- Actual matches matrix prediction: "No shift; display identical — predict same as C-BRT-BRT"
- **Same-TZ reload is safe for legacy DateTime with ignoreTimezone=false** in BRT. The `parseDateString()` → `moment(stripped).tz("UTC",true).local()` chain preserves the value because no Z suffix exists to strip, and the moment roundtrip in BRT is stable
- Pre-save raw: `"2026-03-15T00:00:00"` → post-reload raw: `"2026-03-15T00:00:00"` — zero drift
- GFV returns raw unchanged (consistent with TC-8-H-BRT finding that `useLegacy=true` bypasses GFV transformation)
- **Key comparison**: Config C non-legacy (3-C-BRT-BRT, PASS) also survives same-TZ reload. Both legacy and non-legacy DateTime with `ignoreTimezone=false` are stable in same-TZ
- Record created via typed input → stored as local midnight without Z → reload in same TZ preserves
- Recommended next: run 3-G-BRT-IST (cross-TZ) to test if Bug #1 causes shift when loading BRT-saved Config G in IST
