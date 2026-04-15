# TC-13-query-consistency — DB Query: date range queries return inconsistent results for cross-TZ data (FORM-BUG-7)

## Environment Specs

| Parameter          | Required Value                                                                        |
| ------------------ | ------------------------------------------------------------------------------------- |
| **Browser**        | N/A — REST API verification                                                           |
| **Platform**       | VisualVault REST API (`getForms` with OData query filter)                             |
| **VV Code Path**   | N/A — API query layer                                                                 |
| **Target Records** | DateTest-000080 (BRT-saved) and DateTest-000084 (IST-saved), both with March 15 input |
| **Scope**          | Config A (date-only) query consistency across records saved from different timezones  |

---

## Preconditions

**P1 — Ensure VV REST API access** via `run-ws-test.js` with valid `.env.json` credentials.

**P2 — Verify stored values**: DateTest-000080 field7 = `"2026-03-15T00:00:00Z"` (BRT), DateTest-000084 field7 = `"2026-03-14T00:00:00Z"` (IST, BUG-7 shifted). Confirm via WS-2.

**P3 — Run WS-8 date query tests** to verify the query engine functions correctly on fresh data.

---

## Test Steps

| #   | Action                   | Test Data                                                          | Expected Result                                            | ✓   |
| --- | ------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------- | --- |
| 1   | Complete setup           | See Preconditions P1–P3                                            | API access confirmed; stored values verified               | ☐   |
| 2   | Read BRT record Config A | WS-2 for DateTest-000080 field7                                    | `"2026-03-15T00:00:00Z"` — query target date               | ☐   |
| 3   | Read IST record Config A | WS-2 for DateTest-000084 field7                                    | `"2026-03-15T00:00:00Z"` — same logical date, same storage | ☐   |
| 4   | Verify query finds both  | `[Field7] eq '2026-03-15'` should find both records                | Both DateTest-000080 and DateTest-000084 returned          | ☐   |
| 5   | WS-8 fresh record query  | `run-ws-test.js --action WS-8 --configs A --input-date 2026-03-15` | All query types PASS (eq, gt, range, fmtUS, noMatch)       | ☐   |

---

## Fail Conditions

**FAIL-1 (Cross-TZ query inconsistency — FORM-BUG-7 consequence):**
Step 3 returns `"2026-03-14T00:00:00Z"` instead of `"2026-03-15T00:00:00Z"`. A query for `[Field7] eq '2026-03-15'` would find the BRT record but miss the IST record.

- Interpretation: FORM-BUG-7 stored the wrong date for IST users. The query engine is correct — it faithfully queries the stored values. The inconsistency is in the stored data, not the query logic. A developer querying for "March 15 records" would silently miss all records entered by UTC+ users.

**FAIL-2 (Query engine returns wrong results):**
Step 5 WS-8 queries fail on fresh WS-created data.

- Interpretation: The query engine itself has issues beyond the storage problem. Investigate the OData filter parser.

---

## Related

| Reference                | Location                                                                         |
| ------------------------ | -------------------------------------------------------------------------------- |
| Matrix row               | `../matrix.md` — row `13-query-consistency`                                      |
| Companion: cross-tz-save | [`tc-13-cross-tz-save.md`](tc-13-cross-tz-save.md) — storage divergence evidence |
| FORM-BUG-7 analysis      | `../analysis/bug-7.md`                                                           |
| WS-8 query tests         | `../../web-services/matrix.md` — WS-8 (Query Date Filtering, all PASS)           |
