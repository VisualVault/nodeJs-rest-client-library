# TC-DB-5-EXACT — Exact Date Match, SQL Filter: Field7 = '3/15/2026' returns only matching records

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

P2 — SQL filter is applied programmatically via the hidden `txtSQLFilter` textarea and the Update button's `__doPostBack`.

## Test Steps

| #   | Action              | Test Data                       | Expected Result                                           | ✓   |
| --- | ------------------- | ------------------------------- | --------------------------------------------------------- | --- |
| 1   | Complete setup      | See Preconditions               | Dashboard loaded, 272 records                             | ☐   |
| 2   | Apply SQL filter    | `Field7 = '3/15/2026'`          | Grid filters to records where Field7 is exactly 3/15/2026 | ☐   |
| 3   | Verify record count | Count filtered rows             | 66 records returned                                       | ☐   |
| 4   | Verify all values   | Check Field7 column             | All 66 records show `3/15/2026` — no other dates          | ☐   |
| 5   | Verify exclusion    | Bug #7 records (3/14/2026)      | Records with `3/14/2026` are excluded from results        | ☐   |
| 6   | Clear filter        | Set empty SQL, trigger postback | Returns to 272 records                                    | ☐   |

## Fail Conditions

1. **FAIL-1 (Wrong records included):** Records with `3/14/2026` or `4/14/2026` appear in results.
    - Interpretation: SQL `=` operator not doing exact date match.

2. **FAIL-2 (Missing records):** Fewer than 66 records returned.
    - Interpretation: SQL date comparison using unexpected format or timezone conversion.

3. **FAIL-3 (Filter not applied):** Still showing 272 records after filter.
    - Interpretation: `__doPostBack` not triggering server-side SQL filter evaluation.

## Related

| Reference     | Location                                        |
| ------------- | ----------------------------------------------- |
| Matrix row    | `matrix.md` — row `db-5-exact`                  |
| Run history   | `summaries/tc-db-5-exact.md`                    |
| SQL analysis  | `analysis.md` § 4 (SQL Query Behavior)          |
| Filter script | `test-filter-v3.js` — Playwright filter utility |
