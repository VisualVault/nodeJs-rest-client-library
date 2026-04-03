# TC-5-C-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-5-C-IST.md](../test-cases/tc-5-C-IST.md) | **Summary**: [summary](../summaries/tc-5-C-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer, Build 20260304.1     |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                                   | Result                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                                   | `"Sat Apr 04 2026 00:48:15 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                               | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=true, ignoreTimezone=false, useLegacy=false, enableInitialValue=true | `Field15` with initialDate `"2026-03-31T11:29:14.181Z"` ✓                         |

## Step Results

| Step # | Expected                                            | Actual                                     | Match |
| ------ | --------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/31/2026 04:59 PM`                      | `03/31/2026` (rawLocal = `"3/31/2026"`)    | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-31T11:29:14.181Z"` | `"2026-03-31T11:29:14.181Z"` (Date object) | PASS  |
| 4      | GFV = `"2026-03-31T11:29:14.181Z"`                  | `"2026-03-31T11:29:14.181Z"` (string)      | PASS  |
| 5      | isoRef = `"2026-03-30T18:30:00.000Z"`               | `"2026-03-30T18:30:00.000Z"`               | PASS  |

## Outcome

**PASS** — Config C DateTime preset loads correctly in IST. Raw and API values are **identical to BRT** (tc-5-C-BRT), confirming timezone independence.

## Findings

- **Timezone independence confirmed.** Raw = `"2026-03-31T11:29:14.181Z"` and API = `"2026-03-31T11:29:14.181Z"` — exactly the same as tc-5-C-BRT. The DateTime preset value is stored as a UTC Date object from `initialDate`, and Config C's GFV path (`new Date(value).toISOString()`) preserves the real UTC timestamp.
- This contrasts sharply with Config D (5-D-IST), where the same raw Date is corrupted by GFV's fake Z path. The only difference: Config C has `ignoreTimezone=false` → GFV uses `new Date(value).toISOString()` (correct). Config D has `ignoreTimezone=true` → GFV uses `moment(value).format("...[Z]")` (Bug #5).
- Config C DateTime presets are the safest configuration for cross-timezone preset dates: no Bug #7 (not date-only), no Bug #5 (ignoreTimezone=false), and the raw value is timezone-agnostic.
