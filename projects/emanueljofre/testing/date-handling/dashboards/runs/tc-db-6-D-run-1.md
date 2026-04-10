# TC-DB-6-D — Run 1 | 2026-04-02 | FAIL-1

**Spec**: [tc-db-6-D.md](tasks/date-handling/dashboards/test-cases/tc-db-6-D.md) | **Summary**: [summary](../summaries/tc-db-6-D.md)

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
| 2      | `"3/15/2026 2:30 PM"` | `"03/15/2026 02:30 PM"`      | **FAIL** |
| 3      | Stored value          | `"2026-03-15T11:30:00"`      | (noted)  |
| 4      | API return            | `"2026-03-15T11:30:00.000Z"` | (noted)  |

## Outcome

**FAIL-1** — Format mismatch: dashboard `3/15/2026 2:30 PM` vs form `03/15/2026 02:30 PM`. The TIME matches (2:30 PM ≡ 02:30 PM) but format has leading zeros.

## Findings

- **Display time matches**: `ignoreTZ=true` forces the form to display the original stored time (2:30 PM) instead of converting to local — unlike Config C where the time shifts
- **But raw value diverged**: Form raw = `"2026-03-15T11:30:00"` (BRT local, 11:30 AM) ≠ stored UTC (14:30). V1 converted internally, but `ignoreTZ` overrides the display.
- **Bug #5 confirmed**: GFV = `"2026-03-15T11:30:00.000Z"` — fake Z added to local 11:30 AM value. If script round-trips via `SetFieldValue(GetFieldValue())`, it treats 11:30 AM as UTC → -3h drift per cycle.
- **Cross-layer**: cosmetic format difference only at display level. Internal values diverge significantly.
