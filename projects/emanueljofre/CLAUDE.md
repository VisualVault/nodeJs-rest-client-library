# EmanuelJofre Project — Development & Testing Environment

## Environment

| Setting   | Value                                    |
| --------- | ---------------------------------------- |
| Server    | vvdemo                                   |
| Customer  | EmanuelJofre                             |
| Database  | Main                                     |
| Base URL  | https://vvdemo.visualvault.com           |
| Read-Only | No                                       |

## Exports

All data extracted via `tools/export/` from the EmanuelJofre admin panels on vvdemo.

| Component          | Count | Location                    |
| ------------------ | ----- | --------------------------- |
| Web Services       | 36 scripts | `exports/web-services/`     |
| Scheduled Services | 5 schedules + 6 scripts | `exports/schedules/`        |
| Global Functions   | 24 functions | `exports/global-functions/` |
| Form Templates     | 108 templates | `exports/form-templates/`   |

Last export: 2026-04-09. All components successful. Note: GetSites script skipped (empty source).

## Commands

```bash
# Export all components
node tools/export/export.js --project emanueljofre

# Export just scripts
node tools/export/export.js --project emanueljofre --component scripts

# Dry-run
node tools/export/export.js --project emanueljofre --dry-run
```

## Analysis

No analysis files yet. Run exports first, then use:

- `node tools/inventory/inventory-fields.js` for field inventory
- `node tools/inventory/inventory-scripts.js` for script inventory

## Related

- This is the primary development/testing environment for platform investigations
- **Test assets catalog: [`test-assets.md`](test-assets.md)** — DateTest forms, saved records, WS harness, field map
- Playwright executable config: `testing/fixtures/vv-config.js`
- Platform date bugs: `tasks/date-handling/`
