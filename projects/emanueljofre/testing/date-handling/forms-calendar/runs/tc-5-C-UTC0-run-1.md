# TC-5-C-UTC0 — Run 1 | 2026-04-03 | UTC0 | PASS

**Spec**: [tc-5-C-UTC0.md](tasks/date-handling/forms-calendar/test-cases/tc-5-C-UTC0.md) | **Summary**: [summary](../summaries/tc-5-C-UTC0.md)

## Environment

| Parameter   | Value                                       |
| ----------- | ------------------------------------------- |
| Date        | 2026-04-03                                  |
| Tester TZ   | Etc/GMT — UTC+0 (GMT)                       |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform    | VisualVault FormViewer, Build 20260304.1    |
| Test Method | Playwright CLI (`timezoneId: Etc/GMT`)      |

## Preconditions Verified

| Check        | Command                                                                             | Result                                                                            |
| ------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                                             | `"Fri Apr 03 2026 19:34:44 GMT+0000 (Greenwich Mean Time)"` — contains GMT+0000 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic`                         | `false` → V1 active ✓                                                             |
| Field lookup | filter by enableTime=true, ignoreTZ=false, useLegacy=false, enableInitialValue=true | `Field15` with initialDate `"2026-03-31T11:29:14.181Z"` ✓                         |

## Step Results

| Step # | Expected                                            | Actual                                     | Match |
| ------ | --------------------------------------------------- | ------------------------------------------ | ----- |
| 2      | Display: `03/31/2026 11:29 AM`                      | `03/31/2026` (rawLocal = `"3/31/2026"`)    | PASS  |
| 3      | Raw `.toISOString()` = `"2026-03-31T11:29:14.181Z"` | `"2026-03-31T11:29:14.181Z"` (Date object) | PASS  |
| 4      | GFV = `"2026-03-31T11:29:14.181Z"`                  | `"2026-03-31T11:29:14.181Z"` (string)      | PASS  |
| 5      | isoRef = `"2026-03-31T00:00:00.000Z"`               | `"2026-03-31T00:00:00.000Z"`               | PASS  |

## Outcome

**PASS** — Config C DateTime preset identical across all 3 TZs (BRT, IST, UTC0). Timezone independence fully confirmed.

## Findings

- Raw = `"2026-03-31T11:29:14.181Z"` and API = `"2026-03-31T11:29:14.181Z"` — identical to tc-5-C-BRT and tc-5-C-IST.
- Completes the Config C preset TZ matrix. Config C is the safest preset configuration: no Bug #7 (not date-only), no Bug #5 (ignoreTZ=false), and values are timezone-agnostic.
