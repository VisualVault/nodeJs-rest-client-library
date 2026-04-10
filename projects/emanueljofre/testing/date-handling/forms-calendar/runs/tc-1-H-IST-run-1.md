# TC-1-H-IST — Run 1 | 2026-03-31 | IST | FAIL-1

**Spec**: [tc-1-H-IST.md](tasks/date-handling/forms-calendar/test-cases/tc-1-H-IST.md) | **Summary**: [summary](../summaries/tc-1-H-IST.md)

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
| TZ           | `new Date().toString()`                                     | `"Tue Mar 31 2026 22:00:17 GMT+0530 (India Standard Time)"` — contains GMT+0530 ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓                                                             |
| Field lookup | filter snippet                                              | `["DataField13"]` ✓                                                               |

## Step Results

| Step #                    | Expected                     | Actual                       | Match    |
| ------------------------- | ---------------------------- | ---------------------------- | -------- |
| Step 4 — display          | `"03/15/2026 12:00 AM"`      | `"03/15/2026 12:00 AM"`      | PASS     |
| Step 5 — raw stored value | `"2026-03-15T00:00:00"`      | `"2026-03-14T18:30:00.000Z"` | **FAIL** |
| Step 6 — GetFieldValue    | `"2026-03-15T00:00:00"`      | `"2026-03-14T18:30:00.000Z"` | **FAIL** |
| Step 7 — isoRef           | `"2026-03-14T18:30:00.000Z"` | `"2026-03-14T18:30:00.000Z"` | PASS     |

## Outcome

**FAIL-1** — Legacy DateTime popup (useLegacy=true, enableTime=true, ignoreTimezone=true) in IST stores full UTC datetime `"2026-03-14T18:30:00.000Z"` instead of correct local-time format `"2026-03-15T00:00:00"`. Result is identical to tc-1-G-IST (Config G, ignoreTZ=false) — the `ignoreTimezone=true` flag has no effect on the legacy popup storage path.

## Findings

- Legacy DateTime popup closes immediately on day click — no Time tab, same as Config G. Time forced to midnight local (00:00 IST = 18:30Z).
- Storage: `"2026-03-14T18:30:00.000Z"` — identical to Config G (tc-1-G-IST), Config E (tc-1-E-IST), and Config F (tc-1-F-IST). All four legacy configs produce the same UTC datetime in IST.
- **ignoreTZ confirmed as no-op on legacy popup path** — Config H (ignoreTZ=true) produces exactly the same result as Config G (ignoreTZ=false). This matches the BRT finding (tc-1-H-BRT = tc-1-G-BRT) and the date-only finding (tc-1-F-IST = tc-1-E-IST). The `ignoreTimezone` flag has zero effect on any legacy popup storage.
- GetFieldValue returns stored value without transformation — no fake-Z (Bug #5 inactive for useLegacy=true). This is the key difference from non-legacy Config D, where GFV adds fake Z causing round-trip drift.
- Display shows correct local date `03/15/2026 12:00 AM`.
- **All four legacy IST popup slots (E/F/G/H) are now complete** — all store `"2026-03-14T18:30:00.000Z"`, confirming: (1) legacy popup always stores raw toISOString(), (2) neither enableTime nor ignoreTimezone alters this behavior, (3) IST midnight crosses to previous UTC day.
