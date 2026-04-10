# TC-9-H-BRT-1 — Run 1 | 2026-04-01 | BRT | PASS

**Spec**: [tc-9-H-BRT-1.md](tasks/date-handling/forms-calendar/test-cases/tc-9-H-BRT-1.md) | **Summary**: [summary](../summaries/tc-9-H-BRT-1.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-01                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                           | Result                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| TZ           | `new Date().toString()`                                                                           | `"Wed Apr 01 2026 14:58:24 GMT-0300 (Brasilia Standard Time)"` — contains GMT-0300 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                       | `false` → V1 active ✓                                                                |
| Field lookup | filter `fieldType===13, enableTime=true, ignoreTZ=true, useLegacy=true, enableInitialValue=false` | `["DataField13"]` ✓                                                                  |

## Step Results

| Step # | Expected                                | Actual                       | Match |
| ------ | --------------------------------------- | ---------------------------- | ----- |
| 3      | `"2026-03-15T00:00:00"` (baseline raw)  | `"2026-03-15T00:00:00"`      | PASS  |
| 4      | `"2026-03-15T00:00:00"` (baseline GFV)  | `"2026-03-15T00:00:00"`      | PASS  |
| 6      | `"2026-03-15T00:00:00"` (post-trip raw) | `"2026-03-15T00:00:00"`      | PASS  |
| 7      | `"2026-03-15T00:00:00"` (post-trip GFV) | `"2026-03-15T00:00:00"`      | PASS  |
| 8      | `"2026-03-15T03:00:00.000Z"` (TZ ref)   | `"2026-03-15T03:00:00.000Z"` | PASS  |

## Outcome

**PASS** — Zero drift after 1 GFV round-trip. `useLegacy=true` returns raw value from GFV (no fake Z), so `SetFieldValue(GetFieldValue())` preserves the value exactly.

## Findings

- Actual matches matrix prediction: 0 drift for Config H in BRT
- **Bug #5 round-trip impact confirmed as useLegacy=false only**: Config H (useLegacy=true) has zero drift, Config D (useLegacy=false, same other flags) drifts -3h/trip. The `!useLegacy` guard in `getCalendarFieldValue()` protects legacy configs from both the GFV fake-Z issue and the resulting round-trip drift
- GFV returns `"2026-03-15T00:00:00"` (no Z) → SFV receives the same string → `normalizeCalValue` parses local time → stores same local time. No Z = no UTC reinterpretation = no drift
- Recommended next: run 9-H-IST-1 to confirm zero drift in IST too (should be TZ-independent since no Z involved)
