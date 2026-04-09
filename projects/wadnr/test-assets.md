# Test Assets — WADNR (vv5dev / WADNR / fpOnline)

Read-write: **No** — enforced in `.env.json`. Test assets can be invoked but not modified.

## Forms

| Name | Template ID | Purpose | Configs | Notes |
|------|-------------|---------|---------|-------|
| zzzDate Test Harness | `ff59bb37-b331-f111-830f-d3ae5cbd0a3d` | Full date config coverage — mirrors emanueljofre DateTest | A-H × 3 modes (26 fields) | Rev 1.2, Released 2026-04-09. Masks cleared (vv5dev auto-populated `MM/dd/yyyy` on all fields during import). Field map identical to `testing/fixtures/vv-config.js` FIELD_MAP |
| zzzTarget Date Test Harness | `3f3a0b1a-4834-f111-8310-f323cafecf11` | URL parameter tests (Category 4) — all fields have `enableQListener=true` | A-H × 3 modes (26 fields) | Rev 1.1, Released 2026-04-09. Mirrors zzzDate Test Harness with enableQListener. Masks cleared. URL in `vv-config.js` |
| zzzJohnDevTest | `c65ba3fe-5629-f111-aaf0-adc8a29b13e2` | Isolate Config D bug (FORM-BUG-5) | D only (1 field: `test2`) | Rev 1.0.18, Released 2026-03-26. Created by John Sevilla for Freshdesk #124697 |

### zzzDate Test Harness — Field Map

Same 8 configs as emanueljofre DateTest. Each config = unique `enableTime` × `ignoreTimezone` × `useLegacy` combination.

| Config | enableTime | ignoreTZ | useLegacy | Base | Preset | CurrentDate |
|--------|-----------|----------|-----------|------|--------|-------------|
| A | false | false | false | Field7 | Field2, Field4 | Field1, Field3 |
| B | false | true | false | Field10 | Field27 | Field28 |
| C | true | false | false | Field6 | Field15 | Field17 |
| D | true | true | false | Field5 | Field16 | Field18 |
| E | false | false | true | Field12 | Field19 | Field23 |
| F | false | true | true | Field11 | Field20 | Field24 |
| G | true | false | true | Field14 | Field21 | Field25 |
| H | true | true | true | Field13 | Field22 | Field26 |

## Web Services

| Name | Description | Purpose | Notes |
|------|-------------|---------|-------|
| zzzJohnDevTestWebSvc | "Only used for dev. Does not need to be migrated" | Tests `postForms` vs `forminstance/` endpoints for Config D time mutation | Script #203. Confirms FORM-BUG-5 cross-layer behavior |

### Other zzz-prefixed web services (not date-related)

| Name | Description |
|------|-------------|
| zzzLibShoppingCartCreateRoss | Shopping cart test |
| zzzLibShoppingCartHandleCartsRoss | Shopping cart test |
| zzzLibShoppingCartManageItemsRoss | Shopping cart test |
| zzzmoi-test | General testing |
| zzzShoppingCartAddRemoveItemsRoss | Shopping cart test |

## Notes

- **Read-only constraint**: WADNR is a near-production environment. No changes to forms or scripts — test by invoking existing assets only.
- **zzzDate Test Harness** was created 2026-04-06 specifically for this investigation. It replicates the emanueljofre DateTest field layout so the same test methodology applies.
- **Exported XMLs**: `tools/explore/zzzDate-Test-Harness.xml` and `tools/explore/zzzJohnDevTest.xml` (not committed — re-export with the exploration script if needed).
- The form template export for this project (`extracts/form-templates/`) does not include zzz-prefixed forms. They were created after the last bulk extraction.
