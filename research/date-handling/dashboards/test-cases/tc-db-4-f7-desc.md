# TC-DB-4-F7-DESC — Field7, Column Sort Descending: reverse chronological order confirmed

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Column**  | `Field7` — Config A (`enableTime=false`) — date-only `M/D/YYYY`               |
| **Sort Trigger**   | `__doPostBack` via column header link click (2nd click)                       |

## Preconditions

P1 — Complete TC-DB-4-F7-ASC (grid is already sorted ascending on Field7).

P2 — Or: open dashboard, click Field7 header once (ascending), then click again (descending).

## Test Steps

| #   | Action                     | Test Data              | Expected Result                                                | ✓   |
| --- | -------------------------- | ---------------------- | -------------------------------------------------------------- | --- |
| 1   | Complete setup             | See Preconditions      | Grid sorted ascending on Field7                                | ☐   |
| 2   | Click Field7 header again  | 2nd click → descending | Grid re-sorts: newest dates first, no chronological violations | ☐   |
| 3   | Verify first non-empty row | After sort stabilizes  | Newest date value appears first (e.g., `6/20/2026`)            | ☐   |
| 4   | Verify last non-empty row  | Bottom of date values  | Oldest date value appears last (e.g., `3/14/2026`)             | ☐   |
| 5   | Check empty cell position  | Rows without Field7    | Empty cells sort to BOTTOM (after dated rows)                  | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong order):** Dates not in reverse chronological sequence.
    - Interpretation: Server descending sort not working correctly for date column.

2. **FAIL-2 (Same as ascending):** Order unchanged from ascending click — 2nd click not toggling direction.
    - Interpretation: RadGrid not recognizing sort state toggle.

## Related

| Reference             | Location                         |
| --------------------- | -------------------------------- |
| Matrix row            | `matrix.md` — row `db-4-f7-desc` |
| Run history           | `summaries/tc-db-4-f7-desc.md`   |
| Ascending counterpart | `test-cases/tc-db-4-f7-asc.md`   |
