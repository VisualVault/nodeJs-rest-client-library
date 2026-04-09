# nodeV2 — VisualVault Node.js Development & Testing Workspace

## What This Repo Is

Fork of [VisualVault/nodeJs-rest-client-library](https://github.com/VisualVault/nodeJs-rest-client-library) under the `emanueljofre` GitHub account. Serves two purposes:

1. **Working environment** for investigating, testing, and documenting VisualVault platform issues (bugs, analysis, improvements)
2. **Development base** for future improvements to the Node.js microservices server and client library itself

## Repo Structure

```
nodeV2/
  lib/VVRestApi/VVRestApiNodeJs/   # Node.js microservices server (Express, REST client, auth)
  scripts/                         # VV script examples and templates (see scripts/)
  tools/                           # Standalone CLI tooling: export, runners, audit, inventory, generators (see tools/)
  testing/                         # Playwright test infrastructure: specs, helpers, fixtures, pipelines (see testing/)
  tasks/                           # Cross-cutting investigations and analysis (see tasks/)
  projects/                        # Customer workspaces with exported artifacts (see projects/)
  docs/                            # Platform documentation: architecture, standards, guides, reference (see docs/)
```

## How the Server Works

**Microservices execution environment** — middleware between VisualVault servers and custom JavaScript business logic. VV sends a script via POST, the server creates a temp module with an injected authenticated `vvClient`, runs it, and returns results. See `scripts/` for execution modes and patterns.

## The VV Client API

The VV client provides managers for documents, forms, library, users, groups, sites, files, email, scripts, customQuery, scheduledProcess, reports, and projects. See `lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js`.

## Authentication

OAuth token-based via `common.js`. Credentials live in root `.env.json` (gitignored), selected by `activeServer` + `activeCustomer` keys. `common.js` handles token acquisition and auto-refresh. Per-environment `"readOnly": true` blocks write operations at the HTTP layer. See `.env.example.json` for structure.

## Development Commands

> Full environment setup: [Dev Setup Guide](docs/guides/dev-setup.md)

```bash
# Start the server
node lib/VVRestApi/VVRestApiNodeJs/app.js

# Test a scheduled script locally
curl http://localhost:3000/TestScripts/Scheduled/ScriptName

# Run tests
npm test

# Lint / Format
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
npm run format            # Format all JS files
```

## Code Quality

ESLint + Prettier + Husky pre-commit hooks. See [Dev Setup Guide](docs/guides/dev-setup.md#2-code-quality-tools) for details.

## Playwright Testing

Browser automation tests in `testing/specs/`. See `testing/CLAUDE.md` for infrastructure and `docs/guides/dev-setup.md` for setup.

```bash
npm run test:pw              # All projects (4 TZ x 3 browsers)
npm run test:pw:brt          # BRT -- all browsers
npm run test:pw:headed       # Headed mode (visible browser)
npm run test:pw:report       # Open HTML report
```

## Web Services Testing

REST API date handling tests via the DateTestWSHarness. Run with `node tools/runners/run-ws-test.js --action WS-2`. See `tasks/date-handling/web-services/README.md`.

## Active Tasks

See `tasks/` folder. Each task gets its own subfolder with analysis, test results, and working notes.

| Task                                              | Status      | Description                                                                           |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| [date-handling](tasks/date-handling/)             | In Progress | Cross-platform date handling bug investigation across Forms, Web Services, Dashboards |
| [form-templates](tasks/form-templates/)           | Active      | VV form template XML analysis, format documentation, and improved template generation |
| [export-optimization](tasks/export-optimization/) | Active      | Export pipeline speed: parallel extraction, revision tracking, API-first              |
| [wadnr](projects/wadnr/)                          | In Progress | WADNR client project: impact analysis, exported artifacts                             |

## Repository Architecture & Sharing Model

This repo serves as both a **shared team workspace** and a **personal development environment**. The sharing boundary is which Git remote you push to, not which files you track.

### Three-Tier Git Model

```
VisualVault/nodeJs-rest-client-library    (upstream — read-only, library source)
        |
        v fork
emanueljofre/nodeV2                       (team shared — tools, tests, docs, analysis)
        |
        v clone + private remote
[private repo]                            (personal — everything including projects/)
```

Every developer commits ALL their work to their **private repo** (full backup, multi-workstation). Shared content flows to `emanueljofre/nodeV2` via PRs.

### What Goes Where

**Shared** (team repo): `lib/`, `docs/`, `scripts/`, `tools/`, `testing/`, `tasks/` analysis + matrix + test-cases.
**Not shared** (private repo only): `projects/`, `tasks/` results/runs/summaries, `.env.json`.

### Guiding Principles

1. **Shared content must be reproducible.** Bug reports describe the bug, reproduction steps, and root cause — anyone with a VV environment can verify.
2. **Tools are environment-agnostic.** Export, audit, inventory, and generator tools work for any VV customer. Hardcoded customer references go in `projects/`.
3. **Customer data never reaches the team repo.** Exported scripts, templates, field inventories — all customer IP. Lives in `projects/{customer}/`.
4. **Tasks hold platform knowledge, projects hold customer data.** Platform bugs go in `tasks/`, customer-specific assessments go in `projects/{customer}/`.
5. **Raw test evidence is personal, analysis is shared.** Run files and summaries are working notes; derived bug reports and analysis are platform documentation.
6. **Historical records are immutable.** Run files and test-case specs document state at execution time. Don't update paths or data retroactively.

### Current State

Single-repo workflow — `emanueljofre/nodeV2` holds everything until team sharing begins. When shared: add a private remote, uncomment `.gitignore` lines for `/projects/` and `tasks/**/runs/`. New developers clone the team repo, rename origin to `shared`, add their private repo as `origin`.

### CLAUDE.md Convention

Every folder that represents a **distinct scope** gets its own `CLAUDE.md`. This gives Claude Code immediate context when working in that area.

**Placement — create a CLAUDE.md for:**

- Top-level topic folders (`tools/`, `testing/`, `tasks/`, `projects/`, `docs/`, `scripts/`)
- Individual tasks (`tasks/{task-name}/`)
- Individual projects (`projects/{customer}/`)

**Placement — do NOT create CLAUDE.md for:**

- Implementation subfolders (`tools/export/`, `testing/fixtures/`, etc.) — described by the parent
- Data directories (`projects/wadnr/exports/`, `tasks/*/runs/`) — no context needed beyond the parent

#### Content Standard: CLAUDE.md Is a Map, Not a Textbook

**Include:** identity (1-2 sentences), structure (subfolder purposes), principles/rules, quick reference commands, pointers to deeper docs. **Exclude:** detailed file inventories, code snippets, config contents, full bug descriptions, per-test counts, API tables, historical narratives — link to the source instead.

**Pruning rules:** (1) One-command rule — if derivable with `ls`/`grep`/`cat`, link instead. (2) No duplication. (3) If it goes stale when a file is added, it doesn't belong. (4) Compress on task completion.

**Size targets:** Root ~150 lines | Scope folders ~30-60 lines | Tasks/Projects flexible but aggressively pruned.

## Upstream Sync

```bash
# Fetch latest from VisualVault upstream
git fetch upstream
git merge upstream/master
```

Origin: `emanueljofre/nodeV2`
Upstream: `VisualVault/nodeJs-rest-client-library`
