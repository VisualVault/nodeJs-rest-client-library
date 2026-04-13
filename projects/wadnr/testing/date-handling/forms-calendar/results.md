# Forms Calendar Results — WADNR (vv5dev)

Session index for forms-calendar test executions on WADNR. Run files in `runs/`.

---

## Session 2026-04-10 (BRT)

**Purpose**: First WADNR forms-calendar validation — cross-environment confirmation of platform bugs
**Key outcomes**: 116/116 PASS (BRT-Chromium). All results identical to EmanuelJofre baseline. All 7 FORM-BUGs confirmed platform-level.

- 2026-04-10 [Full Run](runs/wadnr-full-run-2026-04-10.md) — BRT-Chromium — 116P/0F — Layer 2 regression, all categories
- 2026-04-10 [Audit: Kendo Version](runs/audit-kendo-version-wadnr-2026-04-10.md) — BRT-Chromium — 7P/9F — Cat 15 v2 data capture (kendo global absent, DOM selectors differ, VV pipeline identical)

## Session 2026-04-13 (BRT)

**Purpose**: Cat 14 mask impact Phase A (13 tests) + Cat 16 server TZ vv5dev half (6 tests)
**Key outcomes**: Cat 14: 8P/5F-3. Cat 16: 6 PARTIAL (vv5dev data captured, awaiting vvdemo comparison).

- 2026-04-13 [TC-14-A-SFV Run 1](runs/tc-14-A-SFV-run-1.md) — BRT — PASS — Config A date-only SFV unchanged
- 2026-04-13 [TC-14-C-SFV Run 1](runs/tc-14-C-SFV-run-1.md) — BRT — PASS — Config C SFV raw local, API UTC
- 2026-04-13 [TC-14-D-SFV Run 1](runs/tc-14-D-SFV-run-1.md) — BRT — FAIL-3 — Config D SFV raw OK, API fake Z (Bug #5)
- 2026-04-13 [TC-14-C-GFV Run 1](runs/tc-14-C-GFV-run-1.md) — BRT — PASS — Config C GFV after SFV, correct UTC
- 2026-04-13 [TC-14-D-GFV Run 1](runs/tc-14-D-GFV-run-1.md) — BRT — FAIL-3 — Config D GFV fake Z (Bug #5)
- 2026-04-13 [TC-14-C-popup Run 1](runs/tc-14-C-popup-run-1.md) — BRT — PASS — Config C popup local midnight T00:00:00
- 2026-04-13 [TC-14-D-popup Run 1](runs/tc-14-D-popup-run-1.md) — BRT — FAIL-3 — Config D popup fake Z (Bug #5)
- 2026-04-13 [TC-14-C-typed Run 1](runs/tc-14-C-typed-run-1.md) — BRT — PASS — Config C typed input same as popup
- 2026-04-13 [TC-14-D-typed Run 1](runs/tc-14-D-typed-run-1.md) — BRT — FAIL-3 — Config D typed fake Z (Bug #5)
- 2026-04-13 [TC-14-C-save Run 1](runs/tc-14-C-save-run-1.md) — BRT — PASS — Config C raw preserved after save+reload
- 2026-04-13 [TC-14-D-save Run 1](runs/tc-14-D-save-run-1.md) — BRT — FAIL-3 — Config D fake Z persists after reload
- 2026-04-13 [TC-14-C-API Run 1](runs/tc-14-C-API-run-1.md) — BRT — PASS — Config C API returns T00:00:00Z
- 2026-04-13 [TC-14-D-API Run 1](runs/tc-14-D-API-run-1.md) — BRT — PASS — Config D API identical to C (server stores uniformly)
- 2026-04-13 [TC-16-A-typed Run 1](runs/tc-16-A-typed-run-1.md) — BRT — PASS — API T00:00:00Z identical to vvdemo
- 2026-04-13 [TC-16-C-typed Run 1](runs/tc-16-C-typed-run-1.md) — BRT — PASS — API T00:00:00Z identical to vvdemo
- 2026-04-13 [TC-16-D-SFV Run 1](runs/tc-16-D-SFV-run-1.md) — BRT — PASS — API T14:30:00Z identical (Bug #5 on both)
- 2026-04-13 [TC-16-A-controls Run 1](runs/tc-16-A-controls-run-1.md) — BRT — PASS — reload preserved, identical to vvdemo
- 2026-04-13 [TC-16-C-controls Run 1](runs/tc-16-C-controls-run-1.md) — BRT — PASS — reload preserved, identical to vvdemo
- 2026-04-13 [TC-16-D-controls Run 1](runs/tc-16-D-controls-run-1.md) — BRT — PASS — reload preserved, identical (Bug #5 on both)
