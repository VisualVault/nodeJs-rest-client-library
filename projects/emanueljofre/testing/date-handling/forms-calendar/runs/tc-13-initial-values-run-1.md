# TC-13-initial-values — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-2-10-db-storage-mixed-tz-brt.md](tasks/date-handling/forms-calendar/test-cases/tc-2-10-db-storage-mixed-tz-brt.md) | **Summary**: [summary](../summaries/tc-13-initial-values.md)

## Environment

| Parameter | Value                                                                       |
| --------- | --------------------------------------------------------------------------- |
| Date      | 2026-03-27                                                                  |
| Tester TZ | `America/Sao_Paulo` — UTC-3 (BRT) — note: TZ irrelevant for direct DB query |
| Code path | N/A — direct database query via ConnectionQueryAdmin                        |
| Platform  | VisualVault ConnectionQueryAdmin (Database Query Manager)                   |

## Preconditions Verified

Full precondition verification narrative in archived results.md (pre-2026-04-01).

## Step Results

| Step # | Expected                                                             | Actual                 | Match |
| ------ | -------------------------------------------------------------------- | ---------------------- | ----- |
| 1      | ConnectionQueryAdmin loads; form data connection active              | Confirmed              | PASS  |
| 2      | Query editor opens with empty fields                                 | Confirmed              | PASS  |
| 3      | Name accepted: `TC-2-10 DateTest DB Evidence`                        | Accepted               | PASS  |
| 4      | Description field populated                                          | Confirmed              | PASS  |
| 5      | SQL field populated with SELECT query                                | Confirmed              | PASS  |
| 6      | Preview opens; one row for `DateTest-000004`                         | One row returned       | PASS  |
| 7      | DhDocID: `DateTest-000004`                                           | `DateTest-000004`      | PASS  |
| 8      | DataField1 (Config A, CurrentDate): `3/27/2026 8:02:51 PM`           | `3/27/2026 8:02:51 PM` | PASS  |
| 9      | DataField2 (Config A, Preset March 1): `3/1/2026 3:00:00 AM`         | `3/1/2026 3:00:00 AM`  | PASS  |
| 10     | DataField3 (Config A, CurrentDate duplicate): `3/27/2026 8:02:51 PM` | `3/27/2026 8:02:51 PM` | PASS  |
| 11     | DataField4 (Config A, Preset duplicate): `3/1/2026 3:00:00 AM`       | `3/1/2026 3:00:00 AM`  | PASS  |

> Note: Steps 8–11 cover the initial-value fields (DataField1–4). These fields use `enableInitialValue=true` — `initCalendarValueV1()` creates a `new Date()` or preset Date object, and `getSaveValue()` calls `.toISOString()` then strips the Z, resulting in UTC values stored without a timezone suffix. DataField1/3 store the UTC timestamp at the moment of save (`8:02:51 PM UTC`); DataField2/4 store the UTC equivalent of BRT midnight on March 1 (`3:00:00 AM UTC` = BRT midnight + 3h). This confirms UTC storage for initial-value fields.

## Outcome

**PASS** — Initial-value fields (Config A with `enableInitialValue=true`) store UTC timestamps in the database via `new Date().toISOString()`, confirmed by raw SQL query of DateTest-000004.

## Findings

- DataField1/3 (CurrentDate): `3/27/2026 8:02:51 PM` — the live `new Date()` snapshot taken at save time, stored as UTC.
- DataField2/4 (Preset March 1): `3/1/2026 3:00:00 AM` — BRT midnight March 1 expressed as UTC (UTC-3 midnight = 03:00 UTC).
- Storage path: `initCalendarValueV1()` → Date object → `getSaveValue()` → `.toISOString()` strips Z → UTC value stored without timezone suffix.
- These UTC values are distinct from user-input field values (see 13-user-input), which store local time — creating the mixed-timezone storage pattern.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
