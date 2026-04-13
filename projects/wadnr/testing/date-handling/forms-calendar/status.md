# Forms Calendar Status — WADNR (vv5dev)

Last run: 2026-04-13 | BRT-Chromium | 135P / 5F-3 / 3 PENDING | Cat 1-12: [wadnr-full-run-2026-04-10.md](runs/wadnr-full-run-2026-04-10.md) | Cat 14-16: session 2026-04-13

## Summary

| Category | Spec | Slots | PASS | Notes |
|----------|------|-------|------|-------|
| 1 — Calendar Popup | cat-1 | 2 | 2 | Config A, B |
| 2 — Typed Input | cat-2 | 6 | 6 | Configs A-B, E-H |
| 3 — Server Reload | cat-3 | 6 | 6 | Configs A-B, E-H (BRT→BRT) |
| 4 — URL Params | cat-4-url-params | 14 | 14 | All configs |
| 4 — FillinRelate | cat-4-fillinrelate | 5 | 5 | AA, CA, CD, DC, DD |
| 5 — Preset Date | cat-5 | 6 | 6 | Configs B-C, E-H |
| 6 — Current Date | cat-6 | 6 | 6 | Configs B-C, E-H |
| 7 — SetFieldValue | cat-7 | 23 | 23 | All configs, multiple formats |
| 8 — GetFieldValue | cat-8 | 9 | 9 | Configs A-C, E-H + empty |
| 8B — GetDateObject | cat-8b | 7 | 7 | Configs A, C-E, H + empty |
| 9 — GFV Round-Trip | cat-9-gfv | 6 | 6 | Configs A-C, E, G-H |
| 9 — GDOC Round-Trip | cat-9-gdoc | 3 | 3 | Configs A, C-D |
| 11 — Cross-Timezone | cat-11 | 2 | 2 | Config H roundtrip + IST→BRT load |
| 12 — Edge Cases | cat-12 | 2 | 2 | Near-midnight + empty |
| Audit — Bug 1 TZ Stripping | audit-bug1 | 19 | 19 | parseDateString, V1/V2 paths |
| **Total** | | **116** | **116** | |

## Cross-Environment Differential (Cat 14–16)

| Category | Slots | PASS | FAIL | Status | Notes |
|----------|:-----:|:----:|:----:|--------|-------|
| 14 — Mask Impact | 13 | 8 | 5 (Bug #5) | Phase A done | Unmasked baseline on WADNR. Phase B/C (add masks) pending on EmanuelJofre. |
| 15 — Kendo Widget Compare | 8 | 8 | 0 | **Complete** | Cross-env done. v1≈v2 (corrected: both lack kendo global + name attrs). |
| 16 — Server TZ Form Save | 6 | 6 | 0 | **Complete** | Cross-env done. vv5dev=vvdemo — server TZ irrelevant. |

**Cat 15 findings (corrected 2026-04-13)**: Both envs use Angular module system — no `kendo` global on either, no `[name=FieldN]` DOM selectors on either. Real differences: calendarValueService methods (1 vs 4), property count (26 vs 28). VV value pipeline identical.

## Coverage Gaps

- **IST/UTC timezones**: Not run. Only BRT executed.
- **Cat 1 C-H**: Calendar popup only tested for Config A, B.
- **Cat 3 cross-TZ**: No WADNR saved records — Cat 3 IST↔BRT not possible yet.
- **Cat 5/6 A, D**: Preset/current date not tested for these configs.
- **Cat 10**: Web service input — not implemented in spec suite.
- **Cat 14 Phase B/C**: Mask impact verification pending (requires Form Designer on EmanuelJofre).

## Comparison to EmanuelJofre Baseline

All 116 tests PASS — **identical behavior to EmanuelJofre (vvdemo)**. No WADNR-specific divergence detected. Platform-level bugs (FORM-BUG-1 through 7) exhibit same patterns via audit spec and round-trip tests.
