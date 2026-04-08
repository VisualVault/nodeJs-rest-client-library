# TC-13-query-consistency — Run 1 | 2026-04-08 | BRT | FAIL

**Spec**: [tc-13-query-consistency.md](../test-cases/tc-13-query-consistency.md) | **Summary**: [summary](../summaries/tc-13-query-consistency.md)

## Environment

| Parameter   | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Date        | 2026-04-08                                             |
| Tester TZ   | America/Sao_Paulo — UTC-3 (BRT)                        |
| Code path   | N/A — REST API query verification                      |
| Platform    | VisualVault REST API (getForms with OData filter)      |
| Test Method | `run-ws-test.js --action WS-2` + `--action WS-8` (API) |

## Preconditions Verified

| Check            | Command                                                       | Result                           |
| ---------------- | ------------------------------------------------------------- | -------------------------------- |
| API auth         | `run-ws-test.js` authentication                               | `acquireSecurityToken Success` ✓ |
| BRT stored value | `--action WS-2 --record-id DateTest-000080 --configs A`       | `"2026-03-15T00:00:00Z"` ✓       |
| IST stored value | `--action WS-2 --record-id DateTest-000084 --configs A`       | `"2026-03-14T00:00:00Z"` ✗       |
| WS-8 fresh query | `--action WS-8 --configs A,D --input-date 2026-03-15 --debug` | All 5 query types PASS ✓         |

## Step Results

| Step # | Expected                 | Actual                   | Match    |
| ------ | ------------------------ | ------------------------ | -------- |
| 2      | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | PASS     |
| 3      | `"2026-03-15T00:00:00Z"` | `"2026-03-14T00:00:00Z"` | **FAIL** |
| 4      | Both records found       | Only BRT record matches  | **FAIL** |
| 5      | All WS-8 queries PASS    | All 5 queries PASS       | PASS     |

## Outcome

**FAIL** — Query for March 15 finds BRT-saved record but misses IST-saved record. The query engine is correct (WS-8 all PASS on fresh data), but FORM-BUG-7 stored March 14 for the IST record.

## Findings

- **Query inconsistency confirmed**: `[Field7] eq '2026-03-15'` returns DateTest-000080 (BRT) but not DateTest-000084 (IST), even though both users selected March 15
- **Query engine is sound**: WS-8 tests on fresh WS-created record (DateTest-001916) show all 5 query types passing — eq, gt, range, format mismatch, and no-match all work correctly
- **Root cause is storage, not query**: The inconsistency comes from FORM-BUG-7 storing the wrong date for IST users. A `[Field7] eq '2026-03-14'` query would find the IST record but miss the BRT one
- **Impact**: Any report, dashboard filter, or API query that filters by date will silently exclude records entered by UTC+ users. This is a data integrity issue, not a query bug.
- **Workaround**: Use Config D (DateTime+ignoreTZ) instead of Config A for date fields that will be queried across timezones. Config D stores `"2026-03-15T00:00:00Z"` from both TZs.
