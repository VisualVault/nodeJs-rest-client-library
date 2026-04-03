# TC-DB-5-DT-EXACT — DateTime Exact Match, SQL Filter: date-only input matches midnight only

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field6` — Config C (`enableTime=true`) — DateTime                            |
| **Filter Method**  | SQL WHERE clause via hidden `txtSQLFilter` textarea + `__doPostBack`          |

## Preconditions

P1 — Open the DateTest Dashboard. Verify 272 records total.

P2 — Field6 contains records with various times: 12:00 AM, 2:30 PM, 3:00 AM, 5:30 PM, 9:00 AM.

## Test Steps

| #   | Action              | Test Data                       | Expected Result                                                      | ✓   |
| --- | ------------------- | ------------------------------- | -------------------------------------------------------------------- | --- |
| 1   | Complete setup      | See Preconditions               | Dashboard loaded, 272 records                                        | ☐   |
| 2   | Apply SQL filter    | `Field6 = '3/15/2026'`          | SQL treats `'3/15/2026'` as `3/15/2026 12:00:00 AM` (midnight exact) | ☐   |
| 3   | Verify record count | Count filtered rows             | 25 records returned — midnight-only matches                          | ☐   |
| 4   | Verify all values   | Check Field6 column             | All 25 show `3/15/2026 12:00 AM` — no 2:30 PM or 3:00 AM records     | ☐   |
| 5   | Verify exclusion    | Records with non-midnight times | `3/15/2026 2:30 PM`, `3/15/2026 3:00 AM` etc. are excluded           | ☐   |
| 6   | Clear filter        | Set empty SQL, trigger postback | Returns to 272 records                                               | ☐   |

## Fail Conditions

1. **FAIL-1 (All 3/15 records included):** Records with `3/15/2026 2:30 PM` appear — SQL ignores time component.
    - Interpretation: Server casts DateTime to date-only for comparison. This would mean date-only filters are overly broad on DateTime columns.

2. **FAIL-2 (Zero results):** No records returned.
    - Interpretation: SQL date format incompatible with stored datetime format.

## Related

| Reference             | Location                                  |
| --------------------- | ----------------------------------------- |
| Matrix row            | `matrix.md` — row `db-5-dt-exact`         |
| Run history           | `summaries/tc-db-5-dt-exact.md`           |
| SQL analysis          | `analysis.md` § 4 (SQL Query Behavior)    |
| Mixed storage context | `analysis.md` § 3 (Mixed Time Components) |
