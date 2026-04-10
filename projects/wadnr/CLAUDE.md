# WADNR Project — WA Department of Natural Resources

## Environment

| Setting | Value |
|---------|-------|
| Server | vv5dev |
| Customer | WADNR |
| Database | fpOnline |
| Base URL | https://vv5dev.visualvault.com |
| Read-Only | Yes (enforced in `.env.json`) |
| Write Policy | **allowlist** — writes ONLY to forms/WS listed in `.env.json` `writePolicy` |

Full environment profile (platform versions, services, front-end stack): [`environment.json`](environment.json) — generate with `npm run env:profile -- --project wadnr`.

## Extracts

All data extracted via `tools/extract/` from the WADNR admin panels on vv5dev.

| Component | Count | Location |
|-----------|-------|----------|
| Web Services (Form + Workflow) | 251 scripts | `extracts/web-services/` |
| Scheduled Services | 21 schedules + 20 scripts | `extracts/schedules/` |
| Global Functions | 157 functions | `extracts/global-functions/` |
| Form Templates | 77 XMLs | `extracts/form-templates/` |
| Custom Queries | 447 queries (11 main + 436 form DB) | `extracts/custom-queries/` |

Last full extraction: 2026-04-08.

## Analysis

- `analysis/field-inventory.md` — 137 calendar fields across 35 templates, mapped to date bug exposure (Config A-H)
- `analysis/script-inventory.md` — Script-level date field interactions, WS calls, global function usage
- `analysis/bug-analysis/case-study-124697.md` — Freshdesk #124697 (Jira WADNR-10407): postForms time mutation confirms FORM-BUG-5 cross-layer. Near-production constraint — no changes to DNR environment.

## Commands

```bash
# Re-sync all extracts
node tools/extract/extract.js --project wadnr

# Sync just scripts
node tools/extract/extract.js --project wadnr --component scripts

# Dry-run (show what changed)
node tools/extract/extract.js --project wadnr --dry-run

# Re-generate field inventory
node tools/inventory/inventory-fields.js

# Re-generate script inventory
node tools/inventory/inventory-scripts.js
```

## Write Safety — RESTRICTED ENVIRONMENT

WADNR is a **near-production client environment**. Write operations are governed by the `writePolicy` allowlist in `.env.json`.

**Currently allowed writes:**
- Form: `zzzDate Test Harness` (template `ff59bb37-b331-f111-830f-d3ae5cbd0a3d`) — create and update
- Form: `zzzTarget Date Test Harness` (template `3f3a0b1a-4834-f111-8310-f323cafecf11`) — Category 4 URL param tests (read-only — no form record writes needed, only URL param capture). Template updated to v1.2 (2026-04-10) with `enableQListener=true` on all fields
- Web Service: `zzzJohnDevTestWebSvc` (script 203)

**Everything else is blocked.** Do not:
- Create records on any non-zzz form
- Invoke any non-zzz web service
- Modify document index fields or library items
- Add new entries to the WADNR `writePolicy` without explicit user approval

See root `CLAUDE.md` § "Write Safety" for the full policy and enforcement architecture.

## Date Test Validations (2026-04-10)

### Web Services

All 6 WS bugs + FORM-BUG-7 confirmed as platform-level — results identical to EmanuelJofre. See `tasks/date-handling/web-services/runs/wadnr-full-run-2026-04-10.md` for full results.

Runner requires `--template-name "zzzDate Test Harness"` (form name differs from EmanuelJofre's "DateTest"). Write policy uses name-based resolution at runtime.

### Dashboards

27 PASS / 8 FAIL / 9 BLOCKED across 44 slots. All tested categories match EmanuelJofre. DB-5 (filter) BLOCKED — filter toolbar not enabled on new dashboard. DB-3 D-H BLOCKED — no IST browser data. See `tasks/date-handling/dashboards/runs/wadnr-full-run-2026-04-10.md`.

## Related

- **Test assets catalog: [`test-assets.md`](test-assets.md)** — zzzDate Test Harness, zzzJohnDevTest, zzzJohnDevTestWebSvc
- Platform date bugs: `tasks/date-handling/` (FORM-BUG-1 through 7, WEBSERVICE-BUG-1 through 6, FORMDASHBOARD-BUG-1)
- Support ticket tracking: Freshdesk #124697 / Jira WADNR-10407
