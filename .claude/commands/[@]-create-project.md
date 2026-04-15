---
allowed-tools: Bash, Read, Write, Glob
description: Scaffold a new customer project with standard structure and CLAUDE.md.
---

# Create Project

Create a new customer/environment project workspace under `projects/` with the standard structure, CLAUDE.md, and optional `.env.json` configuration.

## Usage

```
/@-create-project <name> [--server <server>] [--customer <customer>] [--database <database>] [--readonly] [--write-policy <mode>] [--repo <url>]
```

**Example (VV project):** `/@-create-project acme --server vv5dev --customer ACME --database Main --readonly --write-policy allowlist`
**Example (with repo):** `/@-create-project acme --server vv5dev --customer ACME --database Main --repo git@github.com:user/acme-scripts.git`
**Example (non-VV):** `/@-create-project licensing --repo git@github.com:user/licensing.git`

If server/customer/database are not provided AND no `--repo` is the only arg, prompt the user: "Is this a VV project or a non-VV project?"

- VV project: prompt for server/customer/database
- Non-VV: skip VV-specific scaffolding (no .env.json, no extracts, no write policy)

### Write Policy Modes

| Mode           | When to use                                                          | Default for                                    |
| -------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| `unrestricted` | Development sandboxes — all writes allowed                           | Non-readonly environments                      |
| `allowlist`    | Active client projects — writes only to listed test harness forms/WS | Must be specified explicitly                   |
| `blocked`      | No writes at all                                                     | Readonly environments without `--write-policy` |

When `--write-policy allowlist` is specified, **prompt the user** for:

1. Allowed form template IDs and human-readable names (e.g., `ff59bb37-... = zzzDate Test Harness`)
2. Allowed web service names (e.g., `zzzJohnDevTestWebSvc`)

See root `CLAUDE.md` § "Write Safety" for the full policy architecture.

---

## Steps

### 1. Validate the name

- Name must be lowercase-kebab (e.g., `wadnr`, `acme-corp`)
- Check `projects/<name>/` doesn't already exist
- If it exists, stop and report: "Project already exists at projects/<name>/"

### 2. Create directory structure

**VV project (with or without repo):**

```
projects/<name>/
  CLAUDE.md
  extracts/
    web-services/
      scripts/
    schedules/
      scripts/
    global-functions/
    form-templates/
  analysis/
```

**Non-VV project:**

```
projects/<name>/
  CLAUDE.md
  analysis/
  notes/
```

**If `--repo` is provided**, additionally:

```
projects/<name>/repo/       # cloned from the provided URL
```

Run `git clone <url> projects/<name>/repo/`. If the clone fails, create the directory and `git init` inside it, then report the error.

If no `--repo` but the user wants a repo later, they can `mkdir projects/<name>/repo && cd projects/<name>/repo && git init`.

### 3. Generate CLAUDE.md

Use this template, filling in the provided values:

````markdown
# <Name> Project — <Customer Description>

## Environment

| Setting      | Value                                  |
| ------------ | -------------------------------------- |
| Server       | <server>                               |
| Customer     | <customer>                             |
| Database     | <database>                             |
| Base URL     | https://<server>.visualvault.com       |
| Read-Only    | <Yes/No> (enforced in `.env.json`)     |
| Write Policy | `<mode>` — <description based on mode> |

Full environment profile (platform versions, services, front-end stack): [`environment.json`](environment.json) — generate with `npm run env:profile -- --project <name>`.

## Write Safety

{If mode is "allowlist":}

**Currently allowed writes:**

- Form: `<name>` (template `<templateId>`) — create and update
  {repeat for each allowed form}

**Everything else is blocked.** Do not create records on non-allowlisted forms, invoke non-allowlisted web services, or modify documents. See root `CLAUDE.md` § "Write Safety" for the full policy.

{If mode is "blocked":}

**All write operations are blocked.** This environment is read-only. No form records, web service invocations, or document modifications.

{If mode is "unrestricted":}

Development sandbox — all writes allowed. See root `CLAUDE.md` § "Write Safety" for the guard architecture.

## Extracts

All data extracted via `tools/extract/` from the <customer> admin panels on <server>.

| Component          | Count | Location                     |
| ------------------ | ----- | ---------------------------- |
| Web Services       | —     | `extracts/web-services/`     |
| Scheduled Services | —     | `extracts/schedules/`        |
| Global Functions   | —     | `extracts/global-functions/` |
| Form Templates     | —     | `extracts/form-templates/`   |
| Custom Queries     | —     | `extracts/custom-queries/`   |

Last full extraction: not yet run.

## Commands

```bash
# Capture environment profile (platform versions, services, library stack)
npm run env:profile -- --project <name>              # HTTP only (~3s)
npm run env:profile:browser -- --project <name>      # + browser probes (~12s)

# Export all components
node tools/extract/extract.js --project <name>

# Export just scripts
node tools/extract/extract.js --project <name> --component scripts

# Dry-run
node tools/extract/extract.js --project <name> --dry-run
```
````

## Analysis

No analysis files yet. Run exports first, then use:

- `node tools/inventory/inventory-fields.js` for field inventory
- `node tools/inventory/inventory-scripts.js` for script inventory

## Related

- Platform date bugs: `research/date-handling/` (if applicable)

````

### 4. Check .env.json configuration

Read root `.env.json`. Check if `servers.<server>.customers.<customer>` exists.

- If it exists: report "Environment already configured in .env.json". Check if `writePolicy` matches the requested mode — warn if mismatched.
- If it doesn't exist: report "Add this environment to .env.json:" and show the full JSON block including `writePolicy`. Reference `.env.example.json` for the base structure. Include the `writePolicy` block:
  - For `blocked`: `"writePolicy": { "mode": "blocked" }` (or omit — `readOnly: true` without writePolicy defaults to blocked)
  - For `allowlist`: show the full structure with the user-provided form/WS entries:
    ```json
    "writePolicy": {
        "mode": "allowlist",
        "forms": [
            { "templateId": "<user-provided-id>", "name": "<user-provided-name>", "operations": ["create", "update"] }
        ],
        "webServices": [
            { "name": "<user-provided-name>" }
        ],
        "documents": []
    }
    ```
  - For `unrestricted`: no `writePolicy` block needed (absence = unrestricted when `readOnly: false`)
- Do NOT modify `.env.json`.

### 4.5. Template URL registration reminder

If writePolicy mode is `allowlist`, remind the user:

> To run Playwright tests against this environment, add form template URLs to `CUSTOMER_TEMPLATES` in `testing/fixtures/vv-config.js`. Each customer needs its own `formid`, `xcid`, and `xcdid` values. See the existing EmanuelJofre and WADNR entries for the pattern.

### 5. Update projects/CLAUDE.md

Read `projects/CLAUDE.md`. Add the new project to the "Active Projects" table.

### 6. Report

````

Project created: projects/<name>/

Structure:
projects/<name>/CLAUDE.md
{if VV:} projects/<name>/extracts/ (web-services, schedules, global-functions, form-templates, custom-queries)
projects/<name>/analysis/
{if repo:} projects/<name>/repo/ (cloned from <url>)

Next steps:

{if VV:}

1. Ensure .env.json has the <server>/<customer> credentials
2. Run: npm run env:profile -- --project <name> (capture environment profile)
3. Run: npm run env:profile:browser -- --project <name> (add library versions — optional)
4. Run: node tools/extract/extract.js --project <name> --dry-run
5. Review and run without --dry-run to populate exports
   {if repo and no remote:}
6. cd projects/<name>/repo/ && git remote add origin <url> && git push -u origin master
   {if non-VV:}
7. Set up the project repo and start working

```

---

## Constraints

1. **Never modify `.env.json`** — only suggest what to add.
2. **Sharing boundary** — all content in `projects/` is personal. Remind the user if they're on the shared repo.
3. **Follow CLAUDE.md content standard** — the generated CLAUDE.md should be concise (~40 lines) with pointers, not a textbook.
```
