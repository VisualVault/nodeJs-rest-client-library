# Date Handling Status — WADNR (vv5dev)

Last updated: 2026-04-13

## Summary

| Component | Slots | Executed | PASS | FAIL | BLOCKED | Status | Details |
|-----------|-------|----------|------|------|---------|--------|---------|
| Forms Calendar | 269 | 149 | 135 | 11 | 0 | Cat 1-12 + 10 + 14-16 done | [status](forms-calendar/status.md) |
| Web Services | 148 | 148 | 130 | 18 | 0 | Complete | [status](web-services/status.md) |
| Dashboards | 44 | 35 | 27 | 8 | 9 | Complete | [status](dashboards/status.md) |
| **Total** | **461** | **332** | **292** | **37** | **9** | | |

## Notes

- All 6 WS bugs + FORM-BUG-7 + CB-29 confirmed as platform-level — results identical to EmanuelJofre baseline.
- WS-10 forminstance/ previously BLOCKED (8 slots) — **now complete** after write policy fix (body-based template matching).
- Dashboard DB-5 (filter) BLOCKED — filter toolbar not enabled. DB-3 D-H BLOCKED — no IST browser data.
- Forms Calendar Cat 1-12: 116/116 PASS on BRT-Chromium (2026-04-10). Cat 10: 6 Config D scenarios (0P/6F, CB-8 + WS-BUG-5, 2026-04-13).
- Cat 14 (Mask Impact): Phase A complete — 13 tests (8P/5F-3 Bug #5). Phase B/C pending.
- Cat 15 (Kendo Widget): Complete — 8 PASS. v1≈v2, corrected assumptions (both lack kendo global).
- Cat 16 (Server TZ): Complete — 6 PASS. Server TZ irrelevant for form save pipeline.
- Near-production constraint: no changes to DNR environment beyond zzz-prefixed test assets.
