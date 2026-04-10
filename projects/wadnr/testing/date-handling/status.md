# Date Handling Status — WADNR (vv5dev)

Last updated: 2026-04-10

## Summary

| Component | Slots | Executed | PASS | FAIL | BLOCKED | Status | Details |
|-----------|-------|----------|------|------|---------|--------|---------|
| Forms Calendar | 242 | 116 | 116 | 0 | 0 | BRT-Chromium done | [status](forms-calendar/status.md) |
| Web Services | 148 | 148 | 130 | 18 | 0 | Complete | [status](web-services/status.md) |
| Dashboards | 44 | 35 | 27 | 8 | 9 | Complete | [status](dashboards/status.md) |
| **Total** | **434** | **299** | **273** | **26** | **9** | | |

## Notes

- All 6 WS bugs + FORM-BUG-7 + CB-29 confirmed as platform-level — results identical to EmanuelJofre baseline.
- WS-10 forminstance/ previously BLOCKED (8 slots) — **now complete** after write policy fix (body-based template matching).
- Dashboard DB-5 (filter) BLOCKED — filter toolbar not enabled. DB-3 D-H BLOCKED — no IST browser data.
- Forms Calendar: 116/116 PASS on BRT-Chromium (2026-04-10). IST/UTC TZs and Firefox/WebKit not yet run. Cat 3 cross-TZ requires WADNR saved records.
- Near-production constraint: no changes to DNR environment beyond zzz-prefixed test assets.
