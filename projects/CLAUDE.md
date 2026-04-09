# Projects — Customer & Environment Workspaces

Each subfolder is a VV customer or environment with exported artifacts and customer-specific analysis.

## Sharing Rules

**Everything in `projects/` is personal** — customer IP that never reaches the shared team repo. This includes:
- Exported scripts, templates, global functions, schedule configs
- Customer-specific field inventories and script analysis
- Case studies referencing customer tickets

## Creating a New Project

1. Create `projects/{customer}/` with this structure:
   ```
   projects/{customer}/
     CLAUDE.md              # Project context (server, customer, database, readOnly)
     test-assets.md         # Platform-side test components (forms, WS, records)
     exports/               # Extracted data from VV admin panels
     analysis/              # Customer-specific impact assessment
   ```

2. Add a `CLAUDE.md` with: server/customer/database, readOnly flag, export summary, related tasks

3. Configure the environment in `.env.json` under `servers.{name}.customers.{name}`

4. Set `"readOnly": true` for production/client environments

## Running Tools Against a Project

```bash
node tools/export/export.js --output projects/{customer}/exports
node tools/inventory/inventory-fields.js  # reads from project exports
```

## Active Projects

| Project | Environment | Description |
|---------|-------------|-------------|
| `wadnr/` | vv5dev/WADNR/fpOnline | WA DNR: 77 templates, 251 scripts, 157 globals, 21 schedules |
| `emanueljofre/` | vvdemo/EmanuelJofre/Main | Development/testing environment for platform investigations |
