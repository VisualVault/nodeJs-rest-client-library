# TC-DB-6-G — Run 1 | 2026-04-02 | FAIL-2

**Spec**: [tc-db-6-G.md](tasks/date-handling/dashboards/test-cases/tc-db-6-G.md) | **Summary**: [summary](../summaries/tc-db-6-G.md)

## Environment

| Parameter  | Value                                           |
| ---------- | ----------------------------------------------- |
| Date       | 2026-04-02                                      |
| Record     | DateTest-000890 (stored `2026-03-15T14:30:00Z`) |
| Browser TZ | America/Sao_Paulo (BRT, UTC-3)                  |
| Code Path  | V1                                              |

## Step Results

| Step # | Expected              | Actual                  | Match    |
| ------ | --------------------- | ----------------------- | -------- |
| 1      | `"3/15/2026 2:30 PM"` | `"3/15/2026 2:30 PM"`   | PASS     |
| 2      | `"3/15/2026 2:30 PM"` | `"03/15/2026 11:30 AM"` | **FAIL** |

## Outcome

**FAIL-2** — Time shift: dashboard `2:30 PM` (UTC) vs form `11:30 AM` (BRT). Identical to Config C.

## Findings

- Legacy DateTime with ignoreTZ=false: same UTC→BRT conversion as non-legacy Config C
- Raw: `"2026-03-15T11:30:00"`, GFV: `"2026-03-15T11:30:00"` (no fake Z — legacy path)
- `useLegacy=true` does NOT change the cross-layer time shift behavior
