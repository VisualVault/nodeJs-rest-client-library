# TC-DB-6-C — Run 1 | 2026-04-02 | FAIL-2

**Spec**: [tc-db-6-C.md](tasks/date-handling/dashboards/test-cases/tc-db-6-C.md) | **Summary**: [summary](../summaries/tc-db-6-C.md)

## Environment

| Parameter  | Value                                           |
| ---------- | ----------------------------------------------- |
| Date       | 2026-04-02                                      |
| Record     | DateTest-000890 (stored `2026-03-15T14:30:00Z`) |
| Browser TZ | America/Sao_Paulo (BRT, UTC-3)                  |
| Code Path  | V1                                              |

## Step Results

| Step # | Expected              | Actual                       | Match    |
| ------ | --------------------- | ---------------------------- | -------- |
| 1      | `"3/15/2026 2:30 PM"` | `"3/15/2026 2:30 PM"`        | PASS     |
| 2      | `"3/15/2026 2:30 PM"` | `"03/15/2026 11:30 AM"`      | **FAIL** |
| 3      | Stored value          | `"2026-03-15T11:30:00"`      | (noted)  |
| 4      | API return            | `"2026-03-15T14:30:00.000Z"` | (noted)  |

## Outcome

**FAIL-2** — Time shift: dashboard `2:30 PM` (UTC) vs form `11:30 AM` (BRT). Dashboard renders UTC directly, Forms V1 converts to local time (14:30Z - 3h = 11:30 BRT).

## Findings

- **Dashboard**: renders `T14:30:00Z` as `2:30 PM` — UTC time displayed literally
- **Form display**: shows `11:30 AM` — V1 converted UTC to BRT local (14:30 - 3 = 11:30)
- **Form raw**: `"2026-03-15T11:30:00"` — local BRT time stored by V1 after UTC→local conversion
- **Form GFV**: `"2026-03-15T14:30:00.000Z"` — returns original UTC value with Z suffix (this is the REAL Z, not Bug #5 fake Z, because ignoreTZ=false)
- **Cross-layer discrepancy**: 3-hour time difference (UTC-3). This would be 5:5h in IST, 0h in UTC+0
- Both layers show the "correct" value from their own perspective — server shows DB truth, form shows user-local time
