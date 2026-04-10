# TC-3-H-BRT-BRT — Run 1 | 2026-04-02 | BRT | PASS

**Spec**: [tc-3-H-BRT-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-H-BRT-BRT.md) | **Summary**: [summary](../summaries/tc-3-H-BRT-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-02                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                           | Result                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                           | `"Thu Apr 02 2026 10:37:45 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                       | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=true, enableInitialValue=false` | `["DataField13"]` ✓                                                                  |

## Step Results

| Step # | Expected                                   | Actual                       | Match |
| ------ | ------------------------------------------ | ---------------------------- | ----- |
| 2      | `"2026-03-15T00:00:00"` (raw after reload) | `"2026-03-15T00:00:00"`      | PASS  |
| 3      | `"2026-03-15T00:00:00"` (GFV after reload) | `"2026-03-15T00:00:00"`      | PASS  |
| 4      | `true` (GFV === raw)                       | `true`                       | PASS  |
| 5      | `"2026-03-15T03:00:00.000Z"` (TZ ref)      | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Config H legacy DateTime + ignoreTZ value survives same-TZ (BRT→BRT) save/reload cycle intact. Raw stored value `"2026-03-15T00:00:00"` is unchanged after reload. GFV returns raw value without transformation — `useLegacy=true` bypasses Bug #5 fake Z.

## Findings

- Actual matches matrix prediction: "No shift; GFV returns stored value without fake Z (useLegacy=true)"
- **Same-TZ reload is safe for legacy DateTime + ignoreTZ fields** in BRT. The stored `"2026-03-15T00:00:00"` passes through `parseDateString()` unchanged (no Z to strip, moment roundtrip stable)
- Pre-save raw: `"2026-03-15T00:00:00"` → post-reload raw: `"2026-03-15T00:00:00"` — zero drift
- GFV returns raw unchanged — confirms `useLegacy=true` bypasses Bug #5 (consistent with TC-8-H-BRT and TC-3-G-BRT-BRT findings)
- **Key comparison**: Config G (3-G-BRT-BRT, PASS) also passes with same raw/GFV values. Both legacy DateTime configs (G: ignoreTimezone=false, H: ignoreTimezone=true) survive same-TZ reload identically — `ignoreTimezone` does not affect the reload path behavior
- Record: DateTest-000472 Rev 1 (cat3-H-BRT), verified DataField13
- Recommended next: run 3-H-BRT-IST (cross-TZ) to test if legacy DateTime + ignoreTZ survives cross-TZ reload
