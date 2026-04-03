# TC-DB-6-H — Run 1 | 2026-04-02 | FAIL-1

**Spec**: [tc-db-6-H.md](../test-cases/tc-db-6-H.md) | **Summary**: [summary](../summaries/tc-db-6-H.md)

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
| 2      | `"3/15/2026 2:30 PM"` | `"03/15/2026 02:30 PM"` | **FAIL** |

## Outcome

**FAIL-1** — Format mismatch: `2:30 PM` vs `02:30 PM`. Time matches thanks to ignoreTZ. Same pattern as Config D.

## Findings

- Raw: `"2026-03-15T11:30:00"`, GFV: `"2026-03-15T11:30:00"` (no fake Z — legacy)
- Unlike non-legacy Config D, legacy path does NOT add fake Z in GFV
- Display time preserved by ignoreTZ, internal raw still BRT-converted
- DB-6 category complete: all 8 configs show cross-layer discrepancy
