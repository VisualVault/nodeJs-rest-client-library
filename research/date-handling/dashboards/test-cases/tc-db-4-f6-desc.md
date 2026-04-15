# TC-DB-4-F6-DESC — Field6, Column Sort Descending: DateTime reverse chronological order confirmed

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Column**  | `Field6` — Config C (`enableTime=true`) — DateTime `M/D/YYYY H:MM AM/PM`      |
| **Sort Trigger**   | `__doPostBack` via column header link click (2nd click)                       |

## Preconditions

P1 — Complete TC-DB-4-F6-ASC (grid is already sorted ascending on Field6).

P2 — Or: click Field6 header twice from default state.

## Test Steps

| #   | Action                     | Test Data              | Expected Result                                                    | ✓   |
| --- | -------------------------- | ---------------------- | ------------------------------------------------------------------ | --- |
| 1   | Complete setup             | See Preconditions      | Grid sorted ascending on Field6                                    | ☐   |
| 2   | Click Field6 header again  | 2nd click → descending | Grid re-sorts: newest datetimes first, no chronological violations | ☐   |
| 3   | Verify first non-empty row | After sort stabilizes  | Newest datetime appears first (e.g., `6/20/2026 9:00 AM`)          | ☐   |
| 4   | Verify last non-empty row  | Bottom of date values  | Oldest datetime appears last (e.g., `2/15/2026 12:00 AM`)          | ☐   |
| 5   | Check empty cell position  | Rows without Field6    | Empty cells sort to BOTTOM                                         | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong order):** DateTimes not in reverse chronological sequence — time component ignored in sort.
    - Interpretation: Server sorting only by date part, not full datetime.

2. **FAIL-2 (Same as ascending):** Order unchanged — toggle not working.
    - Interpretation: RadGrid sort direction toggle failure.

## Related

| Reference             | Location                         |
| --------------------- | -------------------------------- |
| Matrix row            | `matrix.md` — row `db-4-f6-desc` |
| Run history           | `summaries/tc-db-4-f6-desc.md`   |
| Ascending counterpart | `test-cases/tc-db-4-f6-asc.md`   |
