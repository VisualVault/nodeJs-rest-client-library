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
| Web Services       | —     | `exports/web-services/`     |
| Scheduled Services | —     | `exports/schedules/`        |
| Global Functions   | —     | `exports/global-functions/` |
| Form Templates     | —     | `exports/form-templates/`   |

Last full export: not yet run.

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
- DateTest forms, saved records, and test field configs all live here
- Platform date bugs: `tasks/date-handling/`
