# TC-8-H-IST — Run 1 | 2026-04-03 | IST | PASS

**Spec**: [tc-8-H-IST.md](../test-cases/tc-8-H-IST.md) | **Summary**: [summary](../summaries/tc-8-H-IST.md)

## Environment

| Parameter   | Value                                        |
| ----------- | -------------------------------------------- |
| Date        | 2026-04-03                                   |
| Browser     | Chromium (Playwright headless)               |
| Tester TZ   | Asia/Calcutta — UTC+5:30 (IST)               |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)  |
| Platform    | VisualVault FormViewer                       |
| Test Method | Playwright CLI (`timezoneId: Asia/Calcutta`) |

## Preconditions Verified

| Check        | Command                                                                               | Result                                             |
| ------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| TZ           | `new Date().toString()`                                                               | `"...GMT+0530 (India Standard Time)"` — GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                           | `false` → V1 active ✓                              |
| Field lookup | filter enableTime=true, ignoreTimezone=true, useLegacy=true, enableInitialValue=false | `["Field13"]` ✓                                    |

## Step Results

| Step # | Expected                | Actual                  | Match |
| ------ | ----------------------- | ----------------------- | ----- |
| raw    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |
| api    | `"2026-03-15T00:00:00"` | `"2026-03-15T00:00:00"` | PASS  |

## Outcome

**PASS** — Config H GFV returns raw value unchanged in IST. TZ-invariant behavior confirmed — identical to H-BRT.

## Findings

- Confirms Config H GFV is TZ-invariant: BRT and IST produce identical raw return
- useLegacy=true bypasses Bug #5 in IST just as it does in BRT
- Contrast with Config D-IST: same flags except useLegacy=false, which adds fake Z
- The `useLegacy=true` + `ignoreTimezone=true` combination is the safest DateTime config for round-trip operations
