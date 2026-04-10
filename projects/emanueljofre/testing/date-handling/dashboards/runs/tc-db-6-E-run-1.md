# TC-DB-6-E — Run 1 | 2026-04-02 | FAIL-1

**Spec**: [tc-db-6-E.md](tasks/date-handling/dashboards/test-cases/tc-db-6-E.md) | **Summary**: [summary](../summaries/tc-db-6-E.md)

## Environment

| Parameter | Value           |
| --------- | --------------- |
| Date      | 2026-04-02      |
| Record    | DateTest-000889 |
| Code Path | V1              |

## Step Results

| Step # | Expected      | Actual         | Match    |
| ------ | ------------- | -------------- | -------- |
| 1      | `"3/15/2026"` | `"3/15/2026"`  | PASS     |
| 2      | `"3/15/2026"` | `"03/15/2026"` | **FAIL** |

## Outcome

**FAIL-1** — Format mismatch. Legacy flag has no effect. Raw: `"2026-03-15"`, GFV: `"2026-03-15"`.
