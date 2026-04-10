# Dashboard Status — EmanuelJofre (vvdemo)

Last run: 2026-04-03 | 36P / 8F

Detailed results in run files under `runs/`. TC specs in `tasks/date-handling/dashboards/test-cases/`.

## Summary

| Category | Slots | PASS | FAIL |
|---|---|---|---|
| DB-1 Display Format | 8 | 8 | |
| DB-2 Date Accuracy | 8 | 8 | |
| DB-3 Wrong Date Detection | 8 | 8 | |
| DB-4 Column Sort | 4 | 4 | |
| DB-5 Search / SQL Filter | 4 | 4 | |
| DB-6 Cross-Layer Comparison | 8 | | 8 |
| DB-7 Export Verification | 3 | 3 | |
| DB-8 TZ Independence | 1 | 1 | |
| **TOTAL** | **44** | **36** | **8** |

DB-6 failures are all format mismatch (FAIL-1) or time shift (FAIL-2) — confirmed platform-level behavior (DB-BUG-1, WS-BUG-1).

Per-TC run files and summaries contain detailed actual values and interpretations.
