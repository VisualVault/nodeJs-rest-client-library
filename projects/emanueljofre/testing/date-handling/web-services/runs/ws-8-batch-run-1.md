# WS-8 — Batch Run 1 | 2026-04-02 | BRT | 10 PASS, 0 FAIL

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter      | Value                                 |
| -------------- | ------------------------------------- |
| Date           | 2026-04-02                            |
| Execution Mode | Script (`run-ws-test.js`)             |
| Server TZ      | `America/Sao_Paulo` — UTC-3 (default) |

## Test Record

Created a fresh record with Config A = `"2026-03-15"` and Config C = `"2026-03-15T14:30:00"`. Stored as `"2026-03-15T00:00:00Z"` and `"2026-03-15T14:30:00Z"` respectively. All queries scoped to this record via `[instanceName] eq '...' AND {date query}`.

## Results — Config A (date-only, DataField7)

| ID             | Query Type      | Query                                 | Matched | Status |
| -------------- | --------------- | ------------------------------------- | :-----: | :----: |
| ws-8-A-eq      | Exact match     | `eq '2026-03-15'`                     |   Yes   |  PASS  |
| ws-8-A-gt      | Greater than    | `gt '2026-03-14'`                     |   Yes   |  PASS  |
| ws-8-A-range   | Range           | `ge '2026-03-15' AND le '2026-03-16'` |   Yes   |  PASS  |
| ws-8-A-fmtUS   | Format mismatch | `eq '03/15/2026'`                     |   Yes   |  PASS  |
| ws-8-A-noMatch | No match        | `eq '2026-03-16'`                     |   No    |  PASS  |

## Results — Config C (DateTime, DataField6)

| ID             | Query Type      | Query                                 | Matched | Status |
| -------------- | --------------- | ------------------------------------- | :-----: | :----: |
| ws-8-C-eq      | Exact match     | `eq '2026-03-15T14:30:00'`            |   Yes   |  PASS  |
| ws-8-C-gt      | Greater than    | `gt '2026-03-15T14:00:00'`            |   Yes   |  PASS  |
| ws-8-C-range   | Range           | `ge '2026-03-15' AND le '2026-03-16'` |   Yes   |  PASS  |
| ws-8-C-fmtZ    | Format mismatch | `eq '2026-03-15T14:30:00Z'`           |   Yes   |  PASS  |
| ws-8-C-noMatch | No match        | `eq '2026-03-15T15:00:00'`            |   No    |  PASS  |

## Outcome

**10 PASS, 0 FAIL** — H-10 confirmed. OData query filters work reliably.

## Findings

1. **H-10 confirmed**: OData date filters match stored format correctly for all tested operators (eq, gt, ge, le, range).

2. **Query engine normalizes formats**: US format `'03/15/2026'` matches a value stored as `"2026-03-15T00:00:00Z"`. The query engine parses the date in the filter expression, not just string-matches.

3. **Z suffix in queries works**: `'2026-03-15T14:30:00Z'` matches `"2026-03-15T14:30:00Z"` stored value. The Z is handled transparently.

4. **Date-only range on DateTime field works**: `ge '2026-03-15' AND le '2026-03-16'` correctly matches a DateTime field storing `"2026-03-15T14:30:00Z"`. The query engine interprets date-only as midnight when comparing to DateTime values.

5. **No-match controls verify correctly**: Wrong dates and wrong times correctly return zero results.
