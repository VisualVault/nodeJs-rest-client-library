# Date Handling — Cross-Platform Bug Investigation

## What This Is

Comprehensive investigation of date handling defects across **all VisualVault components**. Goal: find, test, and document every date-related bug in the platform.

## Scope

| Component                           | Status      | Folder                                                                         |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| **Forms — Calendar Fields**         | In Progress | `forms-calendar/` (Cat 1-13 complete, Cat 14 Phase A done, Cat 15-16 complete) |
| **Web Services (REST API)**         | Complete    | `web-services/` (validated on WADNR 2026-04-10)                                |
| **Analytic Dashboards**             | Complete    | `dashboards/` (validated on WADNR 2026-04-10)                                  |
| **VisualVault Reports**             | Not Started | `reports/` (future)                                                            |
| **Document Library (index fields)** | In Progress | `document-library/` (matrix: 8 categories, 52 slots)                           |
| **Workflows (date triggers)**       | Not Started | `workflows/` (future)                                                          |
| **Node.js Client Library**          | Not Started | `node-client/` (future)                                                        |

## Folder Structure

```
research/date-handling/
  analysis/                    # RCA, fix strategy, leadership recommendation, cross-layer consistency matrix
  forms-calendar/              # Forms investigation: analysis/, matrix.md, test-cases/
  web-services/                # WS investigation: analysis/, matrix.md, test-cases/
  dashboards/                  # Dashboard investigation: analysis/, matrix.md, test-cases/
  document-library/            # Document index field investigation: analysis/overview.md
```

## Key Facts

- **Database**: All calendar fields are SQL Server `datetime` type (no `date` type). JS format differences translate to actual data differences in DB.
- **VV server timezone**: BRT (UTC-3).
- **Mixed timezone storage**: Same `datetime` column contains both UTC values (from `toISOString()`) and timezone-ambiguous local values (from `getSaveValue()`).
- **API write path**: REST API (`postForms`) stores dates uniformly — no Config C/D divergence, no FORM-BUG-7. Mixed storage is exclusively a Forms Angular pipeline issue.
- **All 6 cross-cutting questions answered.** See `analysis/temporal-models.md`.

## Confirmed Bugs

| ID         | Name                                                  | Severity | File                                                              |
| ---------- | ----------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| FORM-BUG-1 | Timezone marker stripped on form load                 | Medium   | `forms-calendar/analysis/bug-1-timezone-stripping.md`             |
| FORM-BUG-2 | Popup and typed input store different values          | Low      | `forms-calendar/analysis/bug-2-inconsistent-handlers.md`          |
| FORM-BUG-3 | V2 hardcoded parameters                               | Low      | `forms-calendar/analysis/bug-3-hardcoded-params.md`               |
| FORM-BUG-4 | Save format strips timezone                           | Medium   | `forms-calendar/analysis/bug-4-save-format.md`                    |
| FORM-BUG-5 | Fake Z in GetFieldValue — progressive drift           | **High** | `forms-calendar/analysis/bug-5-fake-z-drift.md`                   |
| FORM-BUG-6 | GetFieldValue returns "Invalid Date" for empty fields | Medium   | `forms-calendar/analysis/bug-6-empty-invalid-date.md`             |
| FORM-BUG-7 | SetFieldValue stores wrong day for UTC+               | **High** | `forms-calendar/analysis/bug-7-wrong-day-utc-plus.md`             |
| WS-BUG-1   | Cross-layer shift (API→Forms)                         | High     | `web-services/analysis/ws-bug-1-cross-layer-shift.md`             |
| WS-BUG-2   | DD/MM/YYYY silently discarded                         | High     | `web-services/analysis/ws-bug-2-latam-data-loss.md`               |
| WS-BUG-3   | Ambiguous dates silently swapped                      | High     | `web-services/analysis/ws-bug-3-ambiguous-dates.md`               |
| WS-BUG-4   | ISO format stored differently than US format          | Medium   | `web-services/analysis/ws-bug-4-iso-vs-us-format.md`              |
| WS-BUG-5   | Time portion silently truncated                       | Medium   | `web-services/analysis/ws-bug-5-time-truncation.md`               |
| WS-BUG-6   | Date-only fields accept time components               | Medium   | `web-services/analysis/ws-bug-6-no-date-only-enforcement.md`      |
| DB-BUG-1   | Dashboard format inconsistency                        | Medium   | `dashboards/analysis/formdashboard-bug-1-format-inconsistency.md` |
| DOC-BUG-1  | Index field: TZ offset converted to UTC, Z stripped   | **High** | `document-library/analysis/overview.md`                           |
| DOC-BUG-2  | Index field: cannot clear date once set               | Medium   | `document-library/analysis/overview.md`                           |

Each bug has a companion `*-fix-recommendations.md` file. See `analysis/temporal-models.md` for the root cause analysis and `analysis/fix-strategy.md` for the fix roadmap.

## Forms Calendar Fields (Current Focus)

See `forms-calendar/matrix.md` for current coverage status.

### Key Context

- **V1 vs V2**: Two init paths gated by `useUpdatedCalendarValueLogic`. All live tests use V1 (default). See `forms-calendar/analysis/overview.md` § V1 vs V2.
- **Code paths**: SetFieldValue, GetFieldValue, form load, save — documented in `forms-calendar/analysis/overview.md` § Confirmed Code Paths.
- **Test assets by environment**: [`projects/emanueljofre/test-assets.md`](../../projects/emanueljofre/test-assets.md) (read-write), [`projects/wadnr/test-assets.md`](../../projects/wadnr/test-assets.md) (read-only)
- **Test forms**: URLs in `testing/fixtures/vv-config.js`. Per-env form names and saved records in `projects/{customer}/test-assets.md`.
- **Field configs**: 8 configs (A-H) × 3 initial-value modes. Field map in `testing/fixtures/vv-config.js` FIELD_MAP. Config details in `forms-calendar/matrix.md`.
- **Console API**: See `docs/reference/vv-form-api.md` for VV.Form inspection methods.

### Testing Method

Tests run via Chrome MCP extension or Playwright. Cross-timezone testing requires changing **macOS system timezone** + restarting Chrome (DevTools Sensors does NOT override JS `Date` timezone). Verify with `new Date().toString()`.

### What Has NOT Been Tested

- `useUpdatedCalendarValueLogic=true` — V2 code path never exercised live
- V1 load path FORM-BUG-7 in IST — code-confirmed but no live test
- Preset/Current Date with `enableTime=true` fields — needs new form fields
- Category 2 legacy typed input (E-H) across all TZs
- Category 14 Phase B/C — masked field behavior (requires Form Designer on EmanuelJofre)

### Next Steps

1. **Category 14 — Mask Impact Phase B/C**: Phase A (unmasked baseline) complete on both environments (13/13, 8P/5F). Phase B/C (add masks, re-run) requires Form Designer on EmanuelJofre.
2. **Category 2 — Typed Input legacy (E-H)**: Typed input for legacy configs across BRT, IST, UTC+0.
3. **Document Library test harness**: DOC-BUG-1/2 identified but no formal test harness yet. Infrastructure difference (`docapi` enabled on vv5dev, disabled on vvdemo) may expose divergent behavior.

See `forms-calendar/matrix.md` for the full test matrix (269 slots, Cat 1–16).
