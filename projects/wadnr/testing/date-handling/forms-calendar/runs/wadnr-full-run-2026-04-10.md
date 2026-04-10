# WADNR Full Forms Calendar Test Run — 2026-04-10

**Environment**: vv5dev / WADNR / fpOnline
**Form**: zzzDate Test Harness (template `ff59bb37-b331-f111-830f-d3ae5cbd0a3d`)
**Execution**: Playwright Layer 2 regression (`npm run test:pw:brt`), BRT-Chromium only
**Date**: 2026-04-10
**Test Data**: 254 entries in `testing/fixtures/test-data.js` (environment-agnostic)

---

## Results Summary

| Category | Spec | Slots | PASS | Notes |
|----------|------|:-----:|:----:|-------|
| **1** Calendar Popup | cat-1 | 2 | 2 | Config A, B |
| **2** Typed Input | cat-2 | 6 | 6 | Configs A-B, E-H |
| **3** Server Reload | cat-3 | 6 | 6 | Configs A-B, E-H (BRT→BRT same-TZ) |
| **4** URL Params | cat-4-url-params | 14 | 14 | All configs, multiple formats |
| **4** FillinRelate | cat-4-fillinrelate | 5 | 5 | AA, CA, CD, DC, DD |
| **5** Preset Date | cat-5 | 6 | 6 | Configs B-C, E-H |
| **6** Current Date | cat-6 | 6 | 6 | Configs B-C, E-H |
| **7** SetFieldValue | cat-7 | 23 | 23 | All configs, 7 input formats |
| **8** GetFieldValue | cat-8 | 9 | 9 | Configs A-C, E-H + empty controls |
| **8B** GetDateObject | cat-8b | 7 | 7 | Configs A, C-E, H + empty controls |
| **9** GFV Round-Trip | cat-9-gfv | 6 | 6 | Configs A-C, E, G-H |
| **9** GDOC Round-Trip | cat-9-gdoc | 3 | 3 | Configs A, C-D |
| **11** Cross-Timezone | cat-11 | 2 | 2 | Config H BRT roundtrip + IST→BRT reload |
| **12** Edge Cases | cat-12 | 2 | 2 | Near-midnight Config C + empty Config A |
| **Audit** Bug 1 TZ Stripping | audit-bug1 | 19 | 19 | parseDateString, V1/V2 paths, saved records |
| **TOTAL** | | **116** | **116** | **Matches EmanuelJofre platform behavior** |

---

## Comparison to EmanuelJofre Baseline

All 116 tests produce **identical results** to the EmanuelJofre (vvdemo) baseline. No WADNR-specific divergence in any category.

### Bug Confirmation (via audit spec + round-trip tests)

| Bug | Config Trigger | Confirmed? | How |
|-----|---------------|:----------:|-----|
| FORM-BUG-1 | Z-stripping in parseDateString | Yes | audit-bug1 Phase 1 |
| FORM-BUG-2 | Config G/H legacy UTC shift | Yes | Cat 7/9 round-trip |
| FORM-BUG-3 | T-truncation in V1 date-only | Yes | audit-bug1 Phase 3b |
| FORM-BUG-4 | Popup stores UTC via toISOString() | Yes | Cat 1 expected values |
| FORM-BUG-5 | GFV appends fake Z (D config) | Yes | Cat 8/9 assertions |
| FORM-BUG-6 | Empty field returns invalid date | Yes | Cat 12 empty control |
| FORM-BUG-7 | IST date shift on reload | Yes | Cat 11 IST→BRT load |

All bugs are **platform-level** — present on both vvdemo and vv5dev instances.

---

## Not Tested in This Run

| Gap | Reason |
|-----|--------|
| IST/UTC timezones | Only BRT project executed |
| Firefox/WebKit browsers | Killed after Chromium completed — user only interested in Chrome |
| Cat 3 cross-TZ (IST↔BRT) | No WADNR saved records in `saved-records.json` |
| Cat 1 C-H (popup) | Only A, B have BRT-Chromium test-data entries |
| Cat 5/6 A, D | No BRT entries for these configs |
| Cat 10 (WS input) | Not implemented in spec suite |

---

## Environment Notes

- WADNR form harness `zzzDate Test Harness` deployed 2026-04-09 (Rev 1.2)
- Field map identical to EmanuelJofre DateTest — same 8 configs (A-H), same field names
- Write policy allows create/update on this form (`ff59bb37...` in allowlist)
- Playwright auth via `global-setup.js` → `auth-state-pw.json`
