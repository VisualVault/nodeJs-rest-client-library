# TC-2-E-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-2-E-IST.md](../test-cases/tc-2-E-IST.md) | **Summary**: [summary](../summaries/tc-2-E-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | Asia/Calcutta — UTC+5:30 (IST)              |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 23:12:22 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField12"]` ✓                                                               |

## Step Results

| Step # | Expected                     | Actual                       | Match    |
| ------ | ---------------------------- | ---------------------------- | -------- |
| 5      | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| 6      | `"2026-03-15"`               | `"2026-03-14"`               | **FAIL** |
| 7      | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Bug #7 confirmed in legacy typed input path (Config E, IST). Raw stored value is `"2026-03-14"` (-1 day from intended `"2026-03-15"`), while the display shows `03/15/2026`. GetFieldValue returns the same buggy value unchanged.

## Findings

- Matrix prediction `"2026-03-14"` was correct — Bug #7 affects legacy typed input in IST identically to non-legacy configs A/B
- Bug #7 confirmed in legacy typed input path: `moment("03/15/2026").toDate()` parses as IST midnight, `toISOString()` yields March 14 UTC, `getSaveValue()` extracts date-only → `"2026-03-14"`
- Bug #2 also confirmed: popup (1-E-IST) stores `"2026-03-14T18:30:00.000Z"` (full UTC datetime); typed input stores `"2026-03-14"` (date-only string) — different format for the same intended date on the same field
- GetFieldValue returns raw value unchanged — Config E (`enableTime=false`) is outside the Bug #5 surface
- Sibling row 2-F-IST should produce identical result (ignoreTZ has no effect on date-only fields) — recommend running next
