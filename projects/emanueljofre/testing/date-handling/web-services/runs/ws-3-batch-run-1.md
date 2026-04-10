# WS-3 — Batch Run 1 | 2026-04-02 | BRT | 4 PASS, 0 FAIL

**Matrix**: [matrix.md](../matrix.md) | **Analysis**: [analysis.md](../analysis.md)

## Environment

| Parameter              | Value                                 |
| ---------------------- | ------------------------------------- |
| Date                   | 2026-04-02                            |
| Execution Mode         | Script (`run-ws-test.js`)             |
| Server TZ              | `America/Sao_Paulo` — UTC-3 (default) |
| Harness serverTimezone | `America/Sao_Paulo`                   |
| Round-Trip Cycles      | 2                                     |

## Results

| ID         | Config | Input Sent              | Cycle 1 Read             | Cycle 2 Read             | Final Read               | Drift | Status |
| ---------- | :----: | ----------------------- | ------------------------ | ------------------------ | ------------------------ | :---: | :----: |
| ws-3-A-BRT |   A    | `"2026-03-15"`          | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | `"2026-03-15T00:00:00Z"` | false |  PASS  |
| ws-3-C-BRT |   C    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false |  PASS  |
| ws-3-D-BRT |   D    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false |  PASS  |
| ws-3-H-BRT |   H    | `"2026-03-15T14:30:00"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | `"2026-03-15T14:30:00Z"` | false |  PASS  |

## Records Created

| Config | Record          | RevisionId            |
| :----: | --------------- | --------------------- |
|   A    | DateTest-000926 | (from harness output) |
|   C    | DateTest-000927 | (from harness output) |
|   D    | DateTest-000928 | (from harness output) |
|   H    | DateTest-000929 | (from harness output) |

## Outcome

**4 PASS, 0 FAIL** — API round-trip is completely drift-free. H-8 confirmed.

## Findings

- **H-8 confirmed**: API read→write→read cycle produces zero drift across all 4 configs tested (A date-only, C DateTime, D DateTime+ignoreTZ, H legacy DateTime+ignoreTZ).
- The API adds Z suffix on read (`"2026-03-15"` → `"2026-03-15T00:00:00Z"`), and this Z-appended value is accepted without modification on write-back. No accumulation of Z suffixes or format changes.
- **Contrast with Forms**: Forms `GetFieldValue` round-trip drifts for Config D (Bug #5 fake Z causes -3h/trip in BRT, +5:30h/trip in IST). The API path is immune because it never applies the Bug #5 transformation.
- Config H (legacy) behaves identically to non-legacy configs via API — the `useLegacy` flag is invisible to the API layer (consistent with CB-6).
