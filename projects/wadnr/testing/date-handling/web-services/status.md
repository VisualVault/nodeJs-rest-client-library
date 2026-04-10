# Web Services Status — WADNR (vv5dev)

Last run: 2026-04-10 | 140/148 slots | All 6 WS bugs confirmed platform-level

Run: [wadnr-full-run-2026-04-10.md](runs/wadnr-full-run-2026-04-10.md)

## Summary

| Category | Slots | Result | Notes |
|---|---|---|---|
| WS-1 API Write | 16 | 16 PASS | All TZs identical |
| WS-2 API Read (BRT) | 8 | 8 PASS | |
| WS-2 API Read (IST) | 2 | 2 PASS | FORM-BUG-7 visible |
| WS-3 Round-Trip | 4 | 4 PASS | Zero drift |
| WS-4 API→Forms | 10 | Matches baseline | WS-BUG-1 confirmed |
| WS-5 Format Tolerance | 9 | All match | WS-BUG-2/3/5 confirmed |
| WS-6 Empty/Null | 12 | 12 PASS | |
| WS-7 Update Path | 12 | 12 PASS | |
| WS-8 Query Filtering | 10 | 10 PASS | |
| WS-9 Date Computation | 24 | All match | TZ-safe/unsafe patterns |
| WS-10 postForms | 4 | 4 PASS | forminstance/ BLOCKED |

All results identical to EmanuelJofre baseline — bugs are platform-level, not environment-specific.
