# TC-DB-5-DT-RANGE — DateTime Range, SQL Filter: captures all times within date bounds

## Environment Specs

| Parameter          | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Browser**        | Google Chrome, latest stable                                                  |
| **Dashboard URL**  | `FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25` |
| **Grid Component** | Telerik RadGrid (server-rendered, ASP.NET)                                    |
| **TZ Relevance**   | None — server-rendered values are TZ-independent                              |
| **Target Field**   | `Field5` — Config D (`enableTime=true, ignoreTZ=true`) — DateTime             |
| **Filter Method**  | SQL WHERE clause via hidden `txtSQLFilter` textarea + `__doPostBack`          |

## Preconditions

P1 — Open the DateTest Dashboard. Verify 272 records total.

P2 — Field5 contains records with times: 12:00 AM, 2:00 AM, 2:30 PM, 9:00 PM (Bug #5 drift).

P3 — Range designed to capture records across 2 days including Bug #5 drifted values.

## Test Steps

| #   | Action              | Test Data                                                  | Expected Result                                             | ✓   |
| --- | ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- | --- |
| 1   | Complete setup      | See Preconditions                                          | Dashboard loaded, 272 records                               | ☐   |
| 2   | Apply SQL filter    | `Field5 >= '3/14/2026' AND Field5 <= '3/15/2026 11:59 PM'` | Grid filters to DateTime records in 3/14 00:00 – 3/15 23:59 | ☐   |
| 3   | Verify record count | Count filtered rows                                        | 50 records returned                                         | ☐   |
| 4   | Verify values       | Check Field5 column                                        | Mix of times: 12:00 AM, 2:00 AM, 2:30 PM, 9:00 PM           | ☐   |
| 5   | Verify inclusion    | Bug #5 drifted record (DateTest-001079)                    | `3/14/2026 9:00 PM` included in range                       | ☐   |
| 6   | Clear filter        | Set empty SQL, trigger postback                            | Returns to 272 records                                      | ☐   |

## Fail Conditions

1. **FAIL-1 (Bug #5 record excluded):** DateTest-001079 (`3/14/2026 9:00 PM`) not in results.
    - Interpretation: `>=` boundary not including `3/14/2026` fully, or time precision issue.

2. **FAIL-2 (Out-of-range records):** Records with `6/20/2026` or other dates outside range appear.
    - Interpretation: SQL range comparison not working correctly for DateTime.

## Related

| Reference           | Location                                    |
| ------------------- | ------------------------------------------- |
| Matrix row          | `matrix.md` — row `db-5-dt-range`           |
| Run history         | `summaries/tc-db-5-dt-range.md`             |
| SQL analysis        | `analysis.md` § 4 (SQL Query Behavior)      |
| Bug #5 drift record | `runs/tc-db-3-D-run-1.md` — DateTest-001079 |
