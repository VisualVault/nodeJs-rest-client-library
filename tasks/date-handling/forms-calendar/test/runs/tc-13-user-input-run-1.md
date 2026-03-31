# TC-13-user-input — Run 1 | 2026-03-27 | BRT | PASS

**Spec**: [tc-2-10-db-storage-mixed-tz-brt.md](../tc-2-10-db-storage-mixed-tz-brt.md) | **Summary**: [summary](../summaries/tc-13-user-input.md)

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

| Step # | Expected                                                                        | Actual                  | Match |
| ------ | ------------------------------------------------------------------------------- | ----------------------- | ----- |
| 1      | ConnectionQueryAdmin loads; form data connection active                         | Confirmed               | PASS  |
| 2      | Query editor opens with empty fields                                            | Confirmed               | PASS  |
| 3      | Name accepted: `TC-2-10 DateTest DB Evidence`                                   | Accepted                | PASS  |
| 4      | Description field populated                                                     | Confirmed               | PASS  |
| 5      | SQL field populated with SELECT query                                           | Confirmed               | PASS  |
| 6      | Preview opens; one row for `DateTest-000004`                                    | One row returned        | PASS  |
| 7      | DhDocID: `DateTest-000004`                                                      | `DateTest-000004`       | PASS  |
| 12     | DataField5 (Config D, user input): `3/15/2026 12:00:00 AM` — local BRT midnight | `3/15/2026 12:00:00 AM` | PASS  |
| 13     | DataField6 (Config C, user input): `3/15/2026 12:00:00 AM` — local BRT midnight | `3/15/2026 12:00:00 AM` | PASS  |
| 14     | DataField7 (Config A, user input): `3/15/2026 12:00:00 AM` — local BRT midnight | `3/15/2026 12:00:00 AM` | PASS  |

> Note: Steps 12–14 cover the user-input fields (DataField5–7, `enableInitialValue=false`). These fields were set by user interaction (calendar popup or typed input) in BRT. `getSaveValue()` for user-input fields calls `getHours()`/`getMinutes()`/`getSeconds()` on the local Date object, producing a local time string without UTC offset. The database stores `3/15/2026 12:00:00 AM` — local BRT midnight without any timezone suffix. Steps 1–7 are shared with the 13-initial-values run (same DB query session).

## Outcome

**PASS** — User-input calendar fields (Configs A, C, D with `enableInitialValue=false`) store local BRT time without UTC conversion in the database, confirmed by raw SQL query of DateTest-000004.

## Findings

- DataField5 (Config D), DataField6 (Config C), DataField7 (Config A): all stored as `3/15/2026 12:00:00 AM` — local BRT midnight, not UTC.
- Storage path: user sets value via popup or typed input → `getSaveValue()` extracts local time components → stores `"MM/dd/yyyy HH:mm:ss"` without timezone context.
- Contrast with initial-value fields (DataField2/4): those store `3/1/2026 3:00:00 AM` (UTC midnight BRT March 1), not local midnight.
- Both storage values display `12:00 AM` in the form, but they represent different absolute moments: `3/15/2026 12:00:00 AM` for user-input (local) vs `3/1/2026 3:00:00 AM` for preset (UTC). The mixed-timezone pattern means a SQL `WHERE DataField5 = DataField2` would not return the expected rows.

**Full session narrative**: results.md — archived sessions (pre-2026-04-01)
