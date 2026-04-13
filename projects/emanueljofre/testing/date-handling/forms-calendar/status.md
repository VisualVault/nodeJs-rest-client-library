# Forms Calendar Status — EmanuelJofre (vvdemo)

Last run: 2026-04-13 | 269 slots | 218 executed (125P / 93F) | 48 pending

Detailed results in run files under `runs/`. TC specs in `tasks/date-handling/forms-calendar/test-cases/`.

All 7 FORM-BUGs confirmed. See `tasks/date-handling/forms-calendar/analysis/` for bug reports.

## Cross-Environment Differential (Cat 14–16)

| Category | Slots | PASS | Status | Notes |
|----------|:-----:|:----:|--------|-------|
| 14 — Mask Impact | 13 | — | Pending Phase B/C | Phase A ran on WADNR. EmanuelJofre needed for Form Designer mask changes. |
| 15 — Kendo Widget Compare | 8 | 8 | **Complete** | vvdemo v1 data captured 2026-04-13. v1≈v2 (corrected assumptions). |
| 16 — Server TZ Form Save | 6 | 6 | **Complete** | vvdemo half captured 2026-04-13. Identical to vv5dev — server TZ irrelevant. |
