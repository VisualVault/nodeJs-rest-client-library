# TC-DB-4-F7-ASC — Field7, Column Sort Ascending: chronological order confirmed

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Column**  | `Field7` — Config A (`enableTime=false`) — date-only `M/D/YYYY`               |
| **Sort Trigger**   | `__doPostBack` via column header link click                                   |

## Preconditions

P1 — Open the DateTest Dashboard.

P2 — Verify the RadGrid is loaded with column headers visible. Default sort is by Form ID descending.

P3 — Ensure multiple records exist with different Field7 date values (3/14/2026, 3/15/2026, 4/14/2026, etc.).

## Test Steps

| #   | Action                     | Test Data             | Expected Result                                                  | ✓   |
| --- | -------------------------- | --------------------- | ---------------------------------------------------------------- | --- |
| 1   | Complete setup             | See Preconditions     | Dashboard loaded, default order by Form ID                       | ☐   |
| 2   | Click Field7 column header | 1st click → ascending | Grid re-sorts: earliest dates first, no chronological violations | ☐   |
| 3   | Verify first non-empty row | After sort stabilizes | Oldest date value appears first among non-empty rows             | ☐   |
| 4   | Verify last non-empty row  | Bottom of date values | Newest date value appears last among non-empty rows              | ☐   |
| 5   | Check empty cell position  | Rows without Field7   | Empty cells sort to TOP (before dated rows)                      | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong order):** Dates appear out of chronological sequence (e.g., `4/14/2026` before `3/15/2026` in ascending).
    - Interpretation: Server sorts date column as text (alphabetical) instead of as datetime values.

2. **FAIL-2 (No sort):** Grid order unchanged after clicking header — `__doPostBack` not triggering server-side sort.
    - Interpretation: AJAX postback mechanism broken or column not configured as sortable.

## Related

| Reference              | Location                                           |
| ---------------------- | -------------------------------------------------- |
| Matrix row             | `matrix.md` — row `db-4-f7-asc`                    |
| Run history            | `summaries/tc-db-4-f7-asc.md`                      |
| Sort script            | `test-sort-v4.js` — Playwright sort test utility   |
| Cross-reference (DB-1) | `test-cases/tc-db-1-A.md` — Field7 format verified |
