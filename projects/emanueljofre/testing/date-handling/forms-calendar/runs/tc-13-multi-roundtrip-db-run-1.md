# TC-13-multi-roundtrip-db — Run 1 | 2026-04-08 | BRT | FAIL

**Spec**: [tc-13-multi-roundtrip-db.md](tasks/date-handling/forms-calendar/test-cases/tc-13-multi-roundtrip-db.md) | **Summary**: [summary](../summaries/tc-13-multi-roundtrip-db.md)

## Environment

| Parameter   | Value                                                   |
| ----------- | ------------------------------------------------------- |
| Date        | 2026-04-08                                              |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                         |
| Code path   | V1 (`useUpdatedCalendarValueLogic = false`)             |
| Platform    | VisualVault FormViewer, Build 20260304.1 + REST API     |
| Test Method | Playwright CLI (`timezoneId: America/Sao_Paulo`) + WS-2 |

## Preconditions Verified

| Check        | Command                                                     | Result                |
| ------------ | ----------------------------------------------------------- | --------------------- |
| TZ           | `new Date().toString()`                                     | Contains `GMT-0300` ✓ |
| V1/V2        | `VV.Form.calendarValueService.useUpdatedCalendarValueLogic` | `false` → V1 active ✓ |
| Field lookup | Config D filter                                             | `["Field5"]` ✓        |
| Form         | DateTest-001920                                             | Fresh instance ✓      |

## Step Results

| Step # | Expected                       | Actual                   | Match |
| ------ | ------------------------------ | ------------------------ | ----- |
| 2      | `"2026-03-15T00:00:00"`        | `"2026-03-15T00:00:00"`  | PASS  |
| 3-T1   | `"2026-03-14T21:00:00"` (-3h)  | `"2026-03-14T21:00:00"`  | PASS  |
| 3-T2   | `"2026-03-14T18:00:00"` (-6h)  | `"2026-03-14T18:00:00"`  | PASS  |
| 3-T3   | `"2026-03-14T15:00:00"` (-9h)  | `"2026-03-14T15:00:00"`  | PASS  |
| 3-T4   | `"2026-03-14T12:00:00"` (-12h) | `"2026-03-14T12:00:00"`  | PASS  |
| 3-T5   | `"2026-03-14T09:00:00"` (-15h) | `"2026-03-14T09:00:00"`  | PASS  |
| 3-T6   | `"2026-03-14T06:00:00"` (-18h) | `"2026-03-14T06:00:00"`  | PASS  |
| 3-T7   | `"2026-03-14T03:00:00"` (-21h) | `"2026-03-14T03:00:00"`  | PASS  |
| 3-T8   | `"2026-03-14T00:00:00"` (-24h) | `"2026-03-14T00:00:00"`  | PASS  |
| 4      | `"2026-03-14T00:00:00"`        | `"2026-03-14T00:00:00"`  | PASS  |
| 6      | `"2026-03-14T00:00:00Z"`       | `"2026-03-14T00:00:00Z"` | PASS  |

## Outcome

**FAIL** — 8 Bug #5 round-trips produce exactly -24h drift (1 full calendar day) in BRT. The drifted value `"2026-03-14T00:00:00Z"` persists to the database. March 15 has become March 14.

## Findings

- **Exact -24h drift confirmed**: 8 trips × -3h/trip = -24h. Initial `"2026-03-15T00:00:00"` → final `"2026-03-14T00:00:00"`. The drift is perfectly linear and deterministic.
- **Full day corruption**: The date displays as March 14 instead of March 15. For date-only display scenarios (where the time component is hidden), this is indistinguishable from "wrong date" — no visual hint that the time drifted.
- **API confirms DB persistence**: field5 = `"2026-03-14T00:00:00Z"` in the API response. The corruption is permanent.
- **Verification record**: DateTest-001920 (created and saved 2026-04-08 from BRT via Playwright CLI)
- **BRT-specific threshold**: 8 trips = 1 day loss in BRT (UTC-3). Other TZs have different thresholds: IST needs ~4.4 trips (+5:30h each), PST needs ~3.4 trips (-7h each, more destructive per trip).
- **Production scenario**: A scheduled script that synchronizes dates across fields by reading and writing them could silently lose a full day after just 8 executions — well within a typical business quarter.
