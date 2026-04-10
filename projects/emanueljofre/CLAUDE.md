# EmanuelJofre Project — Development & Testing Environment

## Environment

| Setting   | Value                                    |
| --------- | ---------------------------------------- |
| Server    | vvdemo                                   |
| Customer  | EmanuelJofre                             |
| Database  | Main                                     |
| Base URL  | https://vvdemo.visualvault.com           |
| Read-Only | No                                       |
| Write Policy | `unrestricted` — development sandbox, all writes allowed |

Full environment profile (platform versions, services, front-end stack): [`environment.json`](environment.json) — generate with `npm run env:profile -- --project emanueljofre`.

## Extracts

All data extracted via `tools/extract/` from the EmanuelJofre admin panels on vvdemo.

| Component          | Count | Location                    |
| ------------------ | ----- | --------------------------- |
| Web Services       | 36 scripts | `extracts/web-services/`     |
| Scheduled Services | 5 schedules + 6 scripts | `extracts/schedules/`        |
| Global Functions   | 24 functions | `extracts/global-functions/` |
| Form Templates     | 108 templates | `extracts/form-templates/`   |
| Custom Queries     | 130 queries | `extracts/custom-queries/` |

Last extraction: 2026-04-09. All components successful. Note: GetSites script skipped (empty source).

## Commands

```bash
# Extract all components
node tools/extract/extract.js --project emanueljofre

# Extract just scripts
node tools/extract/extract.js --project emanueljofre --component scripts

# Dry-run
node tools/extract/extract.js --project emanueljofre --dry-run
```

## Analysis

No analysis files yet. Run extractions first, then use:

- `node tools/inventory/inventory-fields.js` for field inventory
- `node tools/inventory/inventory-scripts.js` for script inventory

## Related

- This is the primary development/testing environment for platform investigations
- **Test assets catalog: [`test-assets.md`](test-assets.md)** — DateTest forms, saved records, WS harness, field map
- Playwright executable config: `testing/fixtures/vv-config.js`
- Platform date bugs: `tasks/date-handling/`
