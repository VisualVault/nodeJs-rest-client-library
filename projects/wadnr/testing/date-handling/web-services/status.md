# Web Services Status — WADNR (vv5dev)

Last run: 2026-04-10 | 148/148 slots | All 6 WS bugs + CB-29 confirmed platform-level

Runs: [wadnr-full-run-2026-04-10.md](runs/wadnr-full-run-2026-04-10.md), [ws-10-forminstance-unblock-2026-04-10.md](runs/ws-10-forminstance-unblock-2026-04-10.md)

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
| WS-10 postForms vs forminstance/ | 12 | 2 PASS, 10 FAIL | Matches baseline — CB-29, CB-8, #124697 confirmed |

All results identical to EmanuelJofre baseline — bugs are platform-level, not environment-specific.
