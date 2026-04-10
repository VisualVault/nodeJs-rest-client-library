# TC-3-B-IST-BRT — Run 1 | 2026-04-02 | BRT | FAIL-3

**Spec**: [tc-3-B-IST-BRT.md](tasks/date-handling/forms-calendar/test-cases/tc-3-B-IST-BRT.md) | **Summary**: [summary](../summaries/tc-3-B-IST-BRT.md)

## Environment

| Parameter   | Value                                            |
| ----------- | ------------------------------------------------ |
| Date        | 2026-04-02                                       |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                  |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)      |
| Platform    | VisualVault FormViewer, Build 20260304.1         |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) |

## Preconditions Verified

| Check        | Command                                                                                             | Result                |
| ------------ | --------------------------------------------------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                                                             | Contains `GMT-0300` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                                         | `false` → V1 active ✓ |
| Field lookup | filter `fieldType===13, enableTime=false, ignoreTZ=true, useLegacy=false, enableInitialValue=false` | `["DataField10"]` ✓   |

## Step Results

| Step # | Expected                              | Actual                       | Match    |
| ------ | ------------------------------------- | ---------------------------- | -------- |
| 4      | `"2026-03-15"` (raw after reload)     | `"2026-03-14"`               | **FAIL** |
| 5      | `"2026-03-15"` (GFV after reload)     | `"2026-03-14"`               | **FAIL** |
| 6      | `"2026-03-15T03:00:00.000Z"` (TZ ref) | `"2026-03-15T03:00:00.000Z"` | PASS     |

## Outcome

**FAIL-3** — Bug #7 confirmed. Wrong day permanently stored during IST save: `"2026-03-14"` instead of `"2026-03-15"`. BRT reload sees the already-corrupted value unchanged.

## Findings

- Actual matches matrix prediction: "Same as A-IST-BRT (ignoreTZ no effect on date-only)"
- **Bug #7 confirmed for Config B in IST** — identical to Config A (3-A-IST-BRT, FAIL with same `"2026-03-14"`)
- `ignoreTimezone=true` does NOT prevent Bug #7 for date-only fields — the bug is in `normalizeCalValue()` which fires before any ignoreTimezone logic
- GFV returns the corrupted value unchanged (`"2026-03-14"` raw = `"2026-03-14"` api) — no additional GFV transformation for date-only Config B
- Record: DateTest-000485 Rev 1 (cat3-B-IST), verified DataField10 in BRT context
- **Category 3 now fully complete**: 14 PASS, 4 FAIL, 0 PENDING. All 4 FAIL cases are Bug #7 or Bug #1+#4 related
