# WADNR Project — WA Department of Natural Resources

## Environment

| Setting | Value |
|---------|-------|
| Server | vv5dev |
| Customer | WADNR |
| Database | fpOnline |
| Base URL | https://vv5dev.visualvault.com |
| Read-Only | Yes (enforced in `.env.json` — no write operations) |

## Exports

All data extracted via `tools/export/` from the WADNR admin panels on vv5dev.

| Component | Count | Location |
|-----------|-------|----------|
| Web Services (Form + Workflow) | 251 scripts | `exports/web-services/` |
| Scheduled Services | 21 schedules + 20 scripts | `exports/schedules/` |
| Global Functions | 157 functions | `exports/global-functions/` |
| Form Templates | 77 XMLs | `exports/form-templates/` |

Last full export: 2026-04-08.

## Analysis

- `analysis/field-inventory.md` — 137 calendar fields across 35 templates, mapped to date bug exposure (Config A-H)
- `analysis/script-inventory.md` — Script-level date field interactions, WS calls, global function usage
- `analysis/bug-analysis/case-study-124697.md` — Freshdesk #124697 (Jira WADNR-10407): postForms time mutation confirms FORM-BUG-5 cross-layer. Near-production constraint — no changes to DNR environment.

## Commands

```bash
# Re-sync all exports
node tools/export/export.js --project wadnr

# Sync just scripts
node tools/export/export.js --project wadnr --component scripts

# Dry-run (show what changed)
node tools/export/export.js --project wadnr --dry-run

# Re-generate field inventory
node tools/inventory/inventory-fields.js

# Re-generate script inventory
node tools/inventory/inventory-scripts.js
```

## Related

- **Test assets catalog: [`test-assets.md`](test-assets.md)** — zzzDate Test Harness, zzzJohnDevTest, zzzJohnDevTestWebSvc
- Platform date bugs: `tasks/date-handling/` (FORM-BUG-1 through 7, WEBSERVICE-BUG-1 through 6, FORMDASHBOARD-BUG-1)
- Support ticket tracking: Freshdesk #124697 / Jira WADNR-10407
