# TC-DB-6-A — Run 1 | 2026-04-02 | FAIL-1

**Spec**: [tc-db-6-A.md](tasks/date-handling/dashboards/test-cases/tc-db-6-A.md) | **Summary**: [summary](../summaries/tc-db-6-A.md)

## Environment

| Parameter     | Value                                                                       |
| ------------- | --------------------------------------------------------------------------- |
| Date          | 2026-04-02                                                                  |
| Dashboard URL | FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25 |
| Form URL      | FormViewer/app?DataID=f85a0b92-b12e-f111-ba23-0e3ceb11fc25                  |
| Test Method   | Playwright headless Chrome (`test-cross-layer.js`)                          |
| Browser TZ    | America/Sao_Paulo (BRT, UTC-3)                                              |
| Code Path     | V1 (`useUpdatedCalendarValueLogic = false`)                                 |
| Record        | DateTest-000889                                                             |

## Step Results

| Step # | Expected         | Actual         | Match    |
| ------ | ---------------- | -------------- | -------- |
| 1      | `"3/15/2026"`    | `"3/15/2026"`  | PASS     |
| 2      | `"3/15/2026"`    | `"03/15/2026"` | **FAIL** |
| 3      | ISO stored value | `"2026-03-15"` | PASS     |
| 4      | Same as raw      | `"2026-03-15"` | PASS     |

## Outcome

**FAIL-1** — Format mismatch: dashboard `3/15/2026` (M/d/yyyy) vs form `03/15/2026` (MM/dd/yyyy). Date is identical, format differs.

## Findings

- Server-side .NET formatter: `M/d/yyyy` (no leading zeros)
- Client-side Angular SPA: `MM/dd/yyyy` (leading zeros)
- The DATE is correct in both layers — only cosmetic format difference
- Raw value `"2026-03-15"` matches the stored ISO date
- GFV returns same as raw for date-only non-ignoreTZ configs (no Bug #5)
