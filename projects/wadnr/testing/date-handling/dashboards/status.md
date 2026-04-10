# Dashboard Status — WADNR (vv5dev)

Last run: 2026-04-10 | 27P / 8F / 9B | Run: [wadnr-full-run-2026-04-10.md](runs/wadnr-full-run-2026-04-10.md)

## DB-1 Display Format

| ID | Config | Field | Actual | Status | Run |
|---|---|---|---|---|---|
| db-1-A | A | Field7 | `3/14/2026` | PASS | [run-1](runs/tc-db-1-A-run-1.md) |
| db-1-B | B | Field10 | `3/14/2026` | PASS |
| db-1-C | C | Field6 | `3/15/2026 12:00 AM` | PASS |
| db-1-D | D | Field5 | `3/15/2026 12:00 AM` | PASS |
| db-1-E | E | Field12 | `3/15/2026` | PASS |
| db-1-F | F | Field11 | `3/15/2026` | PASS |
| db-1-G | G | Field14 | `3/15/2026 12:00 AM` | PASS |
| db-1-H | H | Field13 | `3/15/2026 12:00 AM` | PASS |

## DB-2 Date Accuracy

| ID | Config | Field | Dashboard Shows | Status |
|---|---|---|---|---|
| db-2-A | A | Field7 | `3/15/2026` | PASS |
| db-2-B | B | Field10 | `3/15/2026` | PASS |
| db-2-C | C | Field6 | `3/15/2026 2:30 PM` | PASS |
| db-2-D | D | Field5 | `3/15/2026 2:30 PM` | PASS |
| db-2-E | E | Field12 | `3/15/2026` | PASS |
| db-2-F | F | Field11 | `3/15/2026` | PASS |
| db-2-G | G | Field14 | `3/15/2026 2:30 PM` | PASS |
| db-2-H | H | Field13 | `3/15/2026 2:30 PM` | PASS |

## DB-3 Wrong Date Detection

| ID | Config | Field | Dashboard Shows | Status |
|---|---|---|---|---|
| db-3-A | A | Field7 | `3/14/2026` | PASS |
| db-3-B | B | Field10 | `3/14/2026` | PASS |
| db-3-C | C | Field6 | `3/14/2026 6:30 PM` | PASS |
| db-3-D | D | Field5 | — | BLOCKED |
| db-3-E | E | Field12 | — | BLOCKED |
| db-3-F | F | Field11 | — | BLOCKED |
| db-3-G | G | Field14 | — | BLOCKED |
| db-3-H | H | Field13 | — | BLOCKED |

## DB-4 Column Sort

| ID | Variant | Column | Direction | Status |
|---|---|---|---|---|
| db-4-f7-asc | A | Field7 | Ascending | PASS |
| db-4-f7-desc | A | Field7 | Descending | PASS |
| db-4-f6-asc | C | Field6 | Ascending | PASS |
| db-4-f6-desc | C | Field6 | Descending | PASS |

## DB-5 Search/SQL Filter

All 4 slots BLOCKED — filter toolbar not enabled on new dashboard.

## DB-6 Cross-Layer Comparison

| ID | Config | Dashboard Value | Form Display | Status |
|---|---|---|---|---|
| db-6-A | A | `3/15/2026` | (not found) | FAIL-1 |
| db-6-B | B | `3/15/2026` | (not found) | FAIL-1 |
| db-6-C | C | `3/15/2026 2:30 PM` | (not found) | FAIL-2 |
| db-6-D | D | `3/15/2026 2:30 PM` | (not found) | FAIL-1 |
| db-6-E | E | `3/15/2026` | `03/15/2026` | FAIL-1 |
| db-6-F | F | `3/15/2026` | `03/15/2026` | FAIL-1 |
| db-6-G | G | `3/15/2026 2:30 PM` | `03/15/2026 11:30 AM` | FAIL-2 |
| db-6-H | H | `3/15/2026 2:30 PM` | `03/15/2026 02:30 PM` | FAIL-1 |

## DB-7 Export Verification

| ID | Format | Status |
|---|---|---|
| db-7-excel | `.xls` (HTML) | PASS |
| db-7-word | `.doc` (HTML) | PASS |
| db-7-xml | `.xml` | PASS |

## DB-8 TZ Independence

| ID | BRT ≡ IST | BRT ≡ UTC0 | Status |
|---|---|---|---|
| db-8-tz | ✓ | ✓ | PASS |
