# TC-1-G-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-1-G-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-G-IST.md) | **Summary**: [summary](../summaries/tc-1-G-IST.md)

## Environment

| Parameter | Value                                       |
| --------- | ------------------------------------------- |
| Date      | 2026-03-31                                  |
| Tester TZ | `Asia/Calcutta` — UTC+5:30 (IST)            |
| Code path | V1 (`useUpdatedCalendarValueLogic = false`) |
| Platform  | VisualVault FormViewer, Build 20260304.1    |

## Preconditions Verified

| Check        | Command                                                     | Result                                                                            |
| ------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 21:41:32 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField14"]` ✓                                                               |

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 4 — display          | `"03/15/2026 12:00 AM"`      | `"03/15/2026 12:00 AM"`      | PASS     |
| Step 5 — raw stored value | `"2026-03-15T00:00:00"`      | `"2026-03-14T18:30:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15T00:00:00"`      | `"2026-03-14T18:30:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy DateTime popup (useLegacy=true, enableTime=true) in IST stores full UTC datetime `"2026-03-14T18:30:00.000Z"` instead of correct local-time format `"2026-03-15T00:00:00"`. The UTC date portion is March 14 — the day before the selected March 15 — because IST midnight = 2026-03-14T18:30:00Z. Two failure modes compound: (1) legacy format stores raw toISOString() with Z suffix instead of local-time format, and (2) for UTC+5:30 the UTC date crosses backward to the previous calendar day.

## Findings

- Legacy DateTime popup closes immediately on day click — no Time tab appears despite `enableTime=true`. Same behavior as tc-1-G-BRT (BRT sibling). Time is forced to midnight local (00:00 IST = 18:30Z).
- Storage format is the same full UTC datetime string as all legacy configs in IST: `"2026-03-14T18:30:00.000Z"` — matching tc-1-E-IST and tc-1-F-IST patterns.
- In BRT, the same Config G stores `"2026-03-15T03:00:00.000Z"` (tc-1-G-BRT) — same UTC day, so the date component doesn't shift. IST (UTC+5:30) crosses midnight backward, making the UTC date March 14 instead of March 15. This is the critical difference between UTC- and UTC+ timezones for legacy configs.
- GetFieldValue returns the same UTC datetime string without transformation — no fake-Z (Bug #5 inactive for `useLegacy=true`). GFV is correct relative to what is stored; the problem is the stored value itself.
- Display shows correct local date `03/15/2026 12:00 AM` — the display layer re-converts the UTC datetime to local IST. The date error is only visible in storage/API, not in the UI.
- Confirms that all legacy configs (E/F/G/H) use the same UTC datetime storage pattern in IST — the `enableTime` and `ignoreTimezone` flags do not alter the legacy popup's storage behavior.
- Establishes that tc-1-H-IST (pending) will produce the identical result — ignoreTZ has no effect on the legacy popup path.
