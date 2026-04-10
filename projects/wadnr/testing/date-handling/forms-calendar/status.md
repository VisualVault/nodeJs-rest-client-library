# Forms Calendar Status — WADNR (vv5dev)

Last run: 2026-04-10 | BRT-Chromium only | 116P / 0F | Run: [wadnr-full-run-2026-04-10.md](runs/wadnr-full-run-2026-04-10.md)

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

## Coverage Gaps

- **IST/UTC timezones**: Not run. Only BRT executed in this session.
- **Cat 1 C-H**: Calendar popup only tested for Config A, B.
- **Cat 3 cross-TZ**: No WADNR saved records — Cat 3 IST↔BRT not possible yet.
- **Cat 5/6 A, D**: Preset/current date not tested for these configs.
- **Cat 10**: Web service input — not implemented in spec suite.

## Comparison to EmanuelJofre Baseline

All 116 tests PASS — **identical behavior to EmanuelJofre (vvdemo)**. No WADNR-specific divergence detected. Platform-level bugs (FORM-BUG-1 through 7) exhibit same patterns via audit spec and round-trip tests.
