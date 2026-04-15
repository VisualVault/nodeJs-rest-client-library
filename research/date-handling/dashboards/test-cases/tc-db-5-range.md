# TC-DB-5-RANGE — Date Range, SQL Filter: captures both correct and Bug #7 shifted dates

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field7` — Config A (`enableTime=false`) — date-only                          |
| **Filter Method**  | SQL WHERE clause via hidden `txtSQLFilter` textarea + `__doPostBack`          |

## Preconditions

P1 — Open the DateTest Dashboard. Verify 272 records total.

P2 — Range designed to capture both correct dates (3/15) and Bug #7 shifted dates (3/14).

## Test Steps

| #   | Action              | Test Data                                         | Expected Result                                      | ✓   |
| --- | ------------------- | ------------------------------------------------- | ---------------------------------------------------- | --- |
| 1   | Complete setup      | See Preconditions                                 | Dashboard loaded, 272 records                        | ☐   |
| 2   | Apply SQL filter    | `Field7 >= '3/14/2026' AND Field7 <= '3/15/2026'` | Grid filters to date-only records in 3/14–3/15 range | ☐   |
| 3   | Verify record count | Count filtered rows                               | 85 records returned (66 correct + 19 Bug #7 shifted) | ☐   |
| 4   | Verify both dates   | Check Field7 column                               | Mix of `3/14/2026` and `3/15/2026` values            | ☐   |
| 5   | Verify exclusion    | Records with `4/14/2026` or `6/20/2026`           | Dates outside range are excluded                     | ☐   |
| 6   | Clear filter        | Set empty SQL, trigger postback                   | Returns to 272 records                               | ☐   |

## Fail Conditions

1. **FAIL-1 (Out-of-range records):** Records with dates outside 3/14–3/15 appear.
    - Interpretation: SQL range comparison not working correctly.

2. **FAIL-2 (Missing Bug #7 records):** Only 66 records (3/15 only), not capturing 3/14 shifted dates.
    - Interpretation: SQL `>=` not inclusive, or Bug #7 records stored differently than expected.

## Related

| Reference      | Location                                 |
| -------------- | ---------------------------------------- |
| Matrix row     | `matrix.md` — row `db-5-range`           |
| Run history    | `summaries/tc-db-5-range.md`             |
| SQL analysis   | `analysis.md` § 4 (SQL Query Behavior)   |
| Bug #7 context | `../forms-calendar/analysis.md` § Bug #7 |
