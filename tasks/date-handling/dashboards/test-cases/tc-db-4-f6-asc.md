# TC-DB-4-F6-ASC — Field6, Column Sort Ascending: DateTime chronological order confirmed

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Column**  | `Field6` — Config C (`enableTime=true`) — DateTime `M/D/YYYY H:MM AM/PM`      |
| **Sort Trigger**   | `__doPostBack` via column header link click                                   |

## Preconditions

P1 — Open the DateTest Dashboard.

P2 — Ensure multiple records with different Field6 DateTime values exist.

P3 — Note: ascending sort places empty cells at TOP. With ~145 empty rows on page 1, most/all dated rows may appear on page 2.

## Test Steps

| #   | Action                     | Test Data              | Expected Result                                                           | ✓   |
| --- | -------------------------- | ---------------------- | ------------------------------------------------------------------------- | --- |
| 1   | Complete setup             | See Preconditions      | Dashboard loaded                                                          | ☐   |
| 2   | Click Field6 column header | 1st click → ascending  | Grid re-sorts: empty cells at top, dated rows at bottom                   | ☐   |
| 3   | Verify sort triggered      | Check row order change | Order differs from default (Form ID desc) — sort postback successful      | ☐   |
| 4   | Verify via descending      | 2nd click confirms     | Descending shows chronological order with 0 violations (see DB-4-F6-DESC) | ☐   |

## Fail Conditions

1. **FAIL-1 (No sort):** Grid order unchanged after clicking header.
    - Interpretation: `__doPostBack` not triggering for DateTime column.

2. **FAIL-2 (Text sort):** Dates sorted alphabetically (e.g., `2/15/2026` before `3/14/2026 12:00 AM` treated as text).
    - Interpretation: Server treating DateTime column as string instead of datetime type.

## Related

| Reference              | Location                                           |
| ---------------------- | -------------------------------------------------- |
| Matrix row             | `matrix.md` — row `db-4-f6-asc`                    |
| Run history            | `summaries/tc-db-4-f6-asc.md`                      |
| Cross-reference (DB-1) | `test-cases/tc-db-1-C.md` — Field6 format verified |
