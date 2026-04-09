---
allowed-tools: Bash, Read, Write, Glob
description: Scaffold a new customer project with standard structure and CLAUDE.md.
---

# Create Project

Create a new customer/environment project workspace under `projects/` with the standard structure, CLAUDE.md, and optional `.env.json` configuration.

## Usage

```
/@-create-project <name> [--server <server>] [--customer <customer>] [--database <database>] [--readonly]
```

**Example:** `/@-create-project acme --server vv5dev --customer ACME --database Main --readonly`

If server/customer/database are not provided, prompt the user for them.

---

## Steps

### 1. Validate the name

- Name must be lowercase-kebab (e.g., `wadnr`, `acme-corp`)
- Check `projects/<name>/` doesn't already exist
- If it exists, stop and report: "Project already exists at projects/<name>/"

### 2. Create directory structure

```
projects/<name>/
  CLAUDE.md
  exports/
    web-services/
      scripts/
    schedules/
      scripts/
    global-functions/
    form-templates/
  analysis/
```

### 3. Generate CLAUDE.md

Use this template, filling in the provided values:

````markdown
# <Name> Project — <Customer Description>

## Environment

| Setting   | Value                              |
| --------- | ---------------------------------- |
| Server    | <server>                           |
| Customer  | <customer>                         |
| Database  | <database>                         |
| Base URL  | https://<server>.visualvault.com   |
| Read-Only | <Yes/No> (enforced in `.env.json`) |

## Exports

All data extracted via `tools/export/` from the <customer> admin panels on <server>.

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
node tools/export/export.js --output projects/<name>/exports

# Export just scripts
node tools/export/export.js --output projects/<name>/exports --component scripts

# Dry-run
node tools/export/export.js --output projects/<name>/exports --dry-run
```
````

## Analysis

No analysis files yet. Run exports first, then use:

- `node tools/inventory/inventory-fields.js` for field inventory
- `node tools/inventory/inventory-scripts.js` for script inventory

## Related

- Platform date bugs: `tasks/date-handling/` (if applicable)

```

### 4. Check .env.json configuration

Read root `.env.json`. Check if `servers.<server>.customers.<customer>` exists.

- If it exists: report "Environment already configured in .env.json"
- If it doesn't exist: report "Add this environment to .env.json:" and show the JSON path that needs to be added, referencing `.env.example.json` for the structure. Do NOT modify `.env.json`.

### 5. Update projects/CLAUDE.md

Read `projects/CLAUDE.md`. Add the new project to the "Active Projects" table.

### 6. Report

```

Project created: projects/<name>/

Structure:
projects/<name>/CLAUDE.md
projects/<name>/exports/ (web-services, schedules, global-functions, form-templates)
projects/<name>/analysis/

Next steps:

1. Ensure .env.json has the <server>/<customer> credentials
2. Run: node tools/export/export.js --output projects/<name>/exports --dry-run
3. Review and run without --dry-run to populate exports

```

---

## Constraints

1. **Never modify `.env.json`** — only suggest what to add.
2. **Sharing boundary** — all content in `projects/` is personal. Remind the user if they're on the shared repo.
3. **Follow CLAUDE.md content standard** — the generated CLAUDE.md should be concise (~40 lines) with pointers, not a textbook.
```
