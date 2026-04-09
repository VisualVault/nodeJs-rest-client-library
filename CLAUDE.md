# nodeV2 — VisualVault Node.js Development & Testing Workspace

## What This Repo Is

Fork of [VisualVault/nodeJs-rest-client-library](https://github.com/VisualVault/nodeJs-rest-client-library) under the `emanueljofre` GitHub account. Serves two purposes:

1. **Working environment** for investigating, testing, and documenting VisualVault platform issues (bugs, analysis, improvements)
2. **Development base** for future improvements to the Node.js microservices server and client library itself

## Repo Structure

```
nodeV2/
  CHANGELOG.md                       # Server/library changes (lib/ scope + project tooling)
  lib/VVRestApi/VVRestApiNodeJs/     # The Node.js microservices server
    app.js                           # Express entry point (port 3000), loads .env.json
    VVRestApi.js                     # Main REST API client wrapper
    common.js                        # Auth, HTTP layer, token management
    config.yml                       # URI templates for all VV API endpoints
    FormsApi.js                      # Forms API methods
    DocApi.js                        # Documents API methods
    StudioApi.js                     # Workflow/Studio API methods
    routes/
      scripts.js                     # POST /scripts — event-based script execution
      scheduledscripts.js            # POST /scheduledscripts — cron-triggered scripts
      testScheduledScripts.js        # GET /testscripts/scheduled/:name — local dev testing
  scripts/                           # Script examples
    form-scripts/                    # Form button event scripts
      ws-harness-button.js           # DateTest WS Harness form button trigger
    server-scripts/                  # Scheduled/server-side scripts
      webservice-test-harness.js     # DateTest WS Harness (all 10 categories via Action param)
    templates/                       # Boilerplate script patterns
      webservice-pattern.js          # Server-side web service template
      web-service-call-pattern.js    # Form button AJAX call template
    test-scripts/                    # Local test scripts
  tools/                             # Standalone CLI tools (not Playwright-dependent)
    export/                          # WADNR export orchestrators
      export.js                      # Unified export orchestrator (scripts, schedules, globals)
      export-scripts.js              # Web services export wrapper
      export-globals.js              # Global functions export (FormViewer runtime introspection)
      export-templates.js            # Playwright-based form template XML export
      components/                    # Per-component export modules
        scripts.js                   # outsideprocessadmin: API metadata + dock panel source extraction
        schedules.js                 # scheduleradmin: grid scraping for schedule config
        globals.js                   # FormViewer: VV.Form.Global runtime introspection
    runners/                         # Direct Node.js CLI runners
      run-ws-test.js                 # WS harness runner (auth + invocation, --debug, TZ= support)
    audit/                           # Verification and exploration scripts
      verify-ws4-browser.js          # Playwright verification for WS-4 cross-layer
      verify-ws10-browser.js         # Playwright verification for WS-10 (postForms vs forminstance)
      verify-format-mismatch.js      # Dashboard vs Forms format comparison
      explore-dashboard.js           # Dashboard grid capture + TZ comparison
    inventory/                       # Codebase analysis and inventory generation
      inventory-fields.js            # Parse template XMLs, generate field inventory
      inventory-scripts.js           # Parse template XMLs, generate script-level date report
    generators/                      # Artifact generators (post-test processing)
      generate-artifacts.js          # Forms artifact generator
      generate-ws-artifacts.js       # WS artifact generator (matrix-based PASS/FAIL)
      generate-dash-artifacts.js     # Dashboard artifact generator (format-pattern validation)
    helpers/                         # Shared helpers (non-Playwright)
      vv-admin.js                    # VV admin page scraping (login, RadGrid, __doPostBack, dock panels)
      vv-sync.js                     # Shared manifest, sync diff, README generation for exports
      ws-api.js                      # Web service API helper
      ws-log.js                      # Log shim for WS harness scripts (proxies to server lib)
  testing/                           # Playwright testing infrastructure
    README.md                        # Testing infrastructure entry point
    playwright.config.js             # 4-TZ config (BRT, IST, UTC0, PST) × 3 browsers = 12 projects
    global-setup.js                  # Auto-login + create saved records before test runs
    config/                          # Credentials, TZ configs, auth state
    helpers/                         # Playwright-specific page helpers
      vv-form.js                     # Generic VV form automation (13 functions)
      vv-calendar.js                 # Calendar popup + typed input helpers
    fixtures/                        # Shared test data and config
      vv-config.js                   # FIELD_MAP, form URLs, saved records
      env-config.js                  # Loads .env.json, maps credentials for Playwright and WS runners
      ws-config.js                   # Web service API config (endpoints, auth, field mapping)
      test-data.js                   # All test case definitions (data-driven)
    reporters/                       # Custom Playwright reporters
      regression-reporter.js         # Captures results + actual values → JSON
    pipelines/                       # Regression pipeline orchestrators
      run-regression.js              # Forms pipeline: Playwright → artifacts
      run-ws-regression.js           # WS pipeline: run-ws-test.js → artifacts
      run-dash-regression.js         # Dashboard pipeline: grid capture → artifacts
    specs/                           # Test spec files
      date-handling/                  # Date-handling test specs (1 per category + dashboard specs)
  projects/                          # Client project workspaces
    wadnr/                           # WADNR project impact analysis
      CLAUDE.md                      # Project-specific instructions
      analysis/                      # Bug case studies and inventories
        field-inventory.md           # Per-template field inventory with config assessment + script interactions
        script-inventory.md          # Script-level analysis: date field interactions, WS calls, global function usage
        bug-analysis/                # Case studies mapping real bugs to investigation findings
          case-study-124697.md       # Freshdesk #124697 — postForms time mutation (DRAFT)
      exports/                       # Exported artifacts from WADNR environment
        form-templates/              # Exported XML templates (77 files)
        global-functions/            # Extracted VV.Form.Global functions (157 .js files + README)
        web-services/                # Extracted microservice scripts (271 .js files + manifest + README)
        schedules/                   # Scheduled service configuration (manifest + README)
  docs/                              # Shared documentation
    architecture/                    # Platform architecture, component diagrams, data flow
    standards/                       # Coding standards, patterns, conventions
      bug-report-standard.md         # Bug report structure, writing principles, companion doc format
    guides/                          # How-to guides, onboarding, troubleshooting
    reference/                       # API reference, config options, field types
  tasks/                             # Investigation and task workspace
    README.md                        # Task index and structure guide
    date-handling/                   # Active: cross-platform date bug investigation
      analysis/                      # Cross-cutting root cause analysis (temporal models)
      forms-calendar/                # Forms calendar field testing (7 bugs, ~242 slots)
        analysis/                    # Analysis & conclusions (overview + 7 bug reports + 7 fix-recommendation companions)
      web-services/                  # REST API date handling testing (148 slots, complete — WS-1 through WS-10)
        analysis/                    # Analysis & conclusions (overview + 6 bug reports + 6 fix-recommendation companions)
      dashboards/                    # Dashboard date display testing (44/44 complete — DB-1 thru DB-8 all done)
        analysis/                    # Analysis & conclusions (overview + 1 bug report + 1 fix-recommendation companion)
    form-templates/                  # XML template analysis, generator, redesigned DateTest v2
        README.md                    # Template format docs and generator usage
        datetest-v2.xml              # Redesigned DateTest form template
        generate-datetest-v2.js      # Template generator script
```

## How the Server Works

This is a **microservices execution environment** — middleware between VisualVault servers and custom JavaScript business logic:

1. VisualVault sends a script (as code text) via POST to this server
2. The server creates a temporary module from the code, injects an authenticated `vvClient`
3. The script runs and sends results back to VisualVault

**Three execution modes:**

- **Event scripts** (`/scripts`) — triggered by form buttons/events. Script gets `vvClient`, `response`, `ffColl` (form field collection)
- **Scheduled scripts** (`/scheduledscripts`) — triggered by cron. Script must export `getCredentials()` and `main(vvClient, response, scriptId)`
- **Test scripts** (`/testscripts/scheduled/:name`) — local dev. Reads from `scripts/test-scripts/scheduled/`

## The VV Client API

`VVRestApi.js` provides managers for VisualVault services:

| Manager            | Purpose                                     |
| ------------------ | ------------------------------------------- |
| `documents`        | Document CRUD, revisions                    |
| `forms`            | Form templates, instances, field operations |
| `library`          | Folders, folder documents                   |
| `users` / `groups` | User and group management                   |
| `sites`            | Site/workspace operations                   |
| `files`            | File upload/download                        |
| `email`            | Send email                                  |
| `scripts`          | Web service execution                       |
| `customQuery`      | Custom query execution                      |
| `scheduledProcess` | Process scheduling                          |
| `reports`          | Report generation                           |
| `projects`         | Project management                          |

## Authentication

OAuth token-based via `common.js`:

- All credentials live in a single root `.env.json` (gitignored, hierarchical format: `servers.{name}.customers.{name}`)
- Active target selected by `activeServer` + `activeCustomer` at root level
- Server path: `app.js` resolves the active server/customer and stores in `global.VV_ENV`; scripts read via `getCredentials()` (client_credentials flow: `clientId`/`clientSecret`)
- Test path: `testing/fixtures/env-config.js` resolves `.env.json` and returns a flat config object for Playwright and WS runner consumers
- Direct runner (`run-ws-test.js`) and Playwright tests both read from `.env.json` via `env-config.js`
- `common.js` handles token acquisition and auto-refresh (30s before expiry)
- All API calls use Bearer token in Authorization header

### `.env.json` structure

```json
{
    "activeServer": "vvdemo",
    "activeCustomer": "EmanuelJofre",
    "servers": {
        "vvdemo": {
            "baseUrl": "https://vvdemo.visualvault.com",
            "customers": {
                "EmanuelJofre": {
                    "customerAlias": "EmanuelJofre",
                    "databaseAlias": "Main",
                    "clientId": "...",
                    "clientSecret": "...",
                    "username": "...",
                    "loginPassword": "...",
                    "audience": "",
                    "readOnly": false
                }
            }
        }
    }
}
```

### Read-Only Environments

Per-environment `"readOnly": true` in `.env.json` blocks all write operations (POST/PUT/DELETE) at the `httpHelper` HTTP layer in `common.js`. Use this for production/client environments (e.g., WADNR) that should never be modified during development or testing.

- Guard enforced in `common.js::__doVvClientCallRequest()` before any HTTP mutation reaches the network
- POST-as-read operations are allowlisted (search, scheduledProcess completion)
- Override with `VV_FORCE_WRITE=1` env var for exceptional cases: `VV_FORCE_WRITE=1 node run-ws-test.js ...`
- Startup warning logged when a readOnly environment is active

## Development Commands

> Full environment setup: [Dev Setup Guide](docs/guides/dev-setup.md)

```bash
# Start the server
node lib/VVRestApi/VVRestApiNodeJs/app.js

# Test a scheduled script locally
curl http://localhost:3000/TestScripts/Scheduled/ScriptName

# Run tests
npm test

# Lint
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues

# Format
npm run format            # Format all JS files
npm run format:check      # Check formatting without writing
```

## Code Quality

ESLint + Prettier + Husky pre-commit hooks. See [Dev Setup Guide](docs/guides/dev-setup.md#2-code-quality-tools) for details.

## Playwright Testing

> Setup & troubleshooting: [Dev Setup Guide](docs/guides/dev-setup.md#4-playwright-testing-setup)

Browser automation for VV platform testing. All infrastructure lives under `testing/`. Two layers:

1. **`/@-test-forms-date-pw <id>`** — interactive `playwright-cli` sessions for live verification + artifact generation
2. **`npx playwright test`** — headless regression runner for parameterized spec files

```bash
npm run test:pw              # All projects (4 TZ × 3 browsers)
npm run test:pw:brt          # BRT — all browsers
npm run test:pw:ist          # IST — all browsers
npm run test:pw:chromium     # Chromium — all TZs
npm run test:pw:firefox      # Firefox — all TZs
npm run test:pw:webkit       # WebKit (Safari) — all TZs
npm run test:pw:headed       # Headed mode (visible browser)
npm run test:pw:report       # Open HTML report

# Regression pipelines (run tests + generate artifacts)
npm run test:pw:regression -- --browser firefox     # Forms: all TZs in Firefox
npm run test:ws:regression -- --tz BRT              # WS: all categories in BRT
npm run test:dash:regression                        # Dashboard: grid capture + DB-1 format check
```

**Test infrastructure** (in `testing/`):

- `fixtures/vv-config.js` — form URLs (DateTest + TargetDateTest), field config map (A-H), record definitions, saved records
- `fixtures/test-data.js` — all test case definitions as structured data (data-driven)
- `helpers/vv-form.js` — generic VV form helpers: navigation, field verification, value capture, save, URL param navigation
- `helpers/vv-calendar.js` — calendar helpers: popup selection (date-only + DateTime + legacy popup), typed input, legacy fields
- `global-setup.js` — auto-login + create saved records via browser UI (per-TZ, cached 1h)
- `specs/date-handling/cat-*.spec.js` — 16 parameterized spec files (cat-1-calendar-popup, cat-1-legacy-popup, 2, 3, 4-url-params, 4-fillinrelate, 4-reload, 5, 6, 7, 8, 8b, 9-gdoc, 9-gfv, 11-cross-timezone, 12)
- `specs/date-handling/dash-*.spec.js` — 4 dashboard specs (filter, sort, export, cross-layer)
- `specs/date-handling/audit-bug1-tz-stripping.spec.js` — Bug #1 TZ stripping audit

Full documentation: [`testing/specs/date-handling/README.md`](testing/specs/date-handling/README.md) | [`docs/guides/playwright-testing.md`](docs/guides/playwright-testing.md)

## Web Services Testing

REST API date handling tests via the `DateTestWSHarness`. Two execution paths:

1. **`run-ws-test.js`** — direct Node.js runner (primary for API tests). Supports `--debug`, `--inspect-brk`, and `TZ=` env var for server TZ simulation
2. **Form button** (`ws-harness-button.js`) — browser path via VV Microservice (for WS-4 cross-layer or production-path validation)

```bash
# Run a WS test directly
node tools/runners/run-ws-test.js --action WS-2 --configs A,D --record-id DateTest-000080

# Simulate cloud TZ
TZ=UTC node tools/runners/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15
```

**Command:** `/@-test-ws-date-pw <test-id>` — executes test, generates artifacts (TC spec, run file, summary), updates matrix.

Full documentation: [`tasks/date-handling/web-services/README.md`](tasks/date-handling/web-services/README.md) | [`docs/guides/scripting.md`](docs/guides/scripting.md)

## Active Tasks

See `tasks/` folder. Each task gets its own subfolder with analysis, test results, and working notes.

| Task                                    | Status      | Description                                                                                        |
| --------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| [date-handling](tasks/date-handling/)   | In Progress | Cross-platform date handling bug investigation across Forms, Web Services, Dashboards              |
| [form-templates](tasks/form-templates/) | Active      | VV form template XML analysis, format documentation, and improved template generation              |
| [wadnr](projects/wadnr/)                | In Progress | WADNR client project: impact analysis, exported artifacts (77 templates, 271 scripts, 157 globals) |

## Platform Documentation

Architecture and reference docs for the VisualVault platform itself (URL patterns, navigation, admin sections, how the Node.js server integrates) are in `docs/`:

- **[Platform Architecture](docs/architecture/visualvault-platform.md)** — URL anatomy, all navigation sections and their paths, Enterprise Tools (Microservices/Scheduled Services/Queries), demo environment GUIDs, how nodeV2 connects to VV
- **[Form Fields Reference](docs/reference/form-fields.md)** — Calendar field config properties, popup modal behavior, V1/V2 code path, VV.Form console API, known bugs summary
- **[VV.Form API Reference](docs/reference/vv-form-api.md)** — Full VV object structure: properties, methods, sub-objects (FormPartition, calendarValueService, Global, currentUser, FormsDataService), field definitions, automation patterns

## Tools

`tools/` contains standalone CLI utilities that are not Playwright test specs. Organized by purpose:

- **`export/`** — WADNR environment export orchestrators (scripts, schedules, globals, templates)
- **`runners/`** — Direct Node.js CLI runners (e.g., `run-ws-test.js` for WS harness invocation)
- **`audit/`** — Verification and exploration scripts (browser-based checks, format comparisons)
- **`inventory/`** — Codebase analysis tools (parse exported XMLs, generate field/script inventories)
- **`generators/`** — Post-test artifact generators (forms, WS, dashboard matrix outputs)
- **`helpers/`** — Shared non-Playwright helpers (`vv-admin.js`, `vv-sync.js`, `ws-api.js`, `ws-log.js`)

## Projects

`projects/` contains client-specific workspaces with exported artifacts and analysis. Each project has its own `CLAUDE.md` with project-specific instructions.

- **[`wadnr/`](projects/wadnr/)** — WADNR impact analysis: 77 exported form templates, 271 microservice scripts, 157 global functions, schedule configs. Analysis includes field inventories, script-level date interaction reports, and bug case studies mapped to investigation findings.

## Repository Architecture & Sharing Model

This repo serves as both a **shared team workspace** and a **personal development environment**. The sharing boundary is which Git remote you push to, not which files you track.

### Three-Tier Git Model

```
VisualVault/nodeJs-rest-client-library    (upstream — read-only, library source)
        │
        ▼ fork
emanueljofre/nodeV2                       (team shared — tools, tests, docs, analysis)
        │
        ▼ clone + private remote
[private repo]                            (personal — everything including projects/)
```

Every developer commits ALL their work to their **private repo** (full backup, multi-workstation). Shared content flows to `emanueljofre/nodeV2` via PRs.

### What Goes Where

| Directory                         | Shared (team repo)? | Purpose                 | Sharing Criteria                                             |
| --------------------------------- | ------------------- | ----------------------- | ------------------------------------------------------------ |
| `lib/`                            | Yes                 | Server code             | Product code — everyone needs it                             |
| `docs/`                           | Yes                 | Platform documentation  | Platform knowledge — benefits all developers                 |
| `scripts/`                        | Yes                 | VV script examples      | Reusable patterns — benefits all developers                  |
| `tools/`                          | Yes                 | Workspace tooling       | General-purpose tools — work for any VV environment          |
| `testing/`                        | Yes                 | Test infrastructure     | Reusable specs, helpers, fixtures, pipelines                 |
| `tasks/` analysis                 | Yes                 | Platform-level findings | Bug reports, RCA, fix strategies — true for all environments |
| `tasks/` matrix, test-cases       | Yes                 | Test methodology        | Reproducible specs — anyone can run them                     |
| `tasks/` results, runs, summaries | **No**              | Execution records       | Reference environment-specific data (record IDs, timestamps) |
| `projects/`                       | **No**              | Customer workspaces     | Customer IP — script source, configs, field inventories      |
| `.env.json`                       | **No**              | Credentials             | Machine-specific secrets                                     |

### Guiding Principles

1. **Shared content must be reproducible.** A bug report in `tasks/` describes the bug, the reproduction steps, and the root cause — it doesn't say "see run-047 line 23." Anyone with a VV environment can verify.

2. **Tools are environment-agnostic.** Export, audit, inventory, and generator tools work for any VV customer, not just WADNR. Hardcoded customer references go in `projects/`, not in `tools/`.

3. **Customer data never reaches the team repo.** Exported scripts, templates, field inventories, schedule configs — all customer IP. Lives in `projects/{customer}/`, committed to the developer's private repo only.

4. **Tasks hold platform knowledge, projects hold customer data.** "FORM-BUG-5 adds a fake Z suffix" → `tasks/` (platform truth). "WADNR has 119 Config B fields exposed to BUG-7" → `projects/wadnr/` (customer-specific assessment).

5. **Raw test evidence is personal, analysis is shared.** `results.md`, `runs/`, and `summaries/` reference specific record IDs and timestamps — they're working notes. The analysis derived from them (bug reports, overview docs) is platform documentation.

6. **Historical records are immutable.** Run files and test-case specs in `tasks/*/runs/` and `tasks/*/test-cases/` document the state at execution time. Don't update paths or data in these files retroactively.

### For New Developers

Clone the team repo, add your private remote:

```bash
git clone emanueljofre/nodeV2 my-vv-workspace
cd my-vv-workspace
git remote rename origin shared
git remote add origin <your-private-repo-url>
git push -u origin main
```

You get: all tools, tests, docs, and platform analysis — ready to use. You add: your own `projects/{customer}/` for each VV environment you work with, your own `.env.json` with credentials, and your own test execution results.

### Current State: Single-Repo Workflow

Until other developers join, `emanueljofre/nodeV2` holds **everything** — shared and personal content together. This is intentional. The directory structure already separates content by type (`tools/` vs `projects/` vs `tasks/`), so no operational change is needed day-to-day. Work normally: improve tools, run tests, export customer data, write analysis — all in this repo.

When the repo is shared with the team:

1. Create a private repo, add it as a second remote
2. Uncomment the `.gitignore` lines for `/projects/` and `tasks/**/runs/` etc.
3. The shared repo is instantly clean — the structure ensures no retroactive cleanup is needed

The sharing awareness built into custom commands (`/@-smart-commit-push` remote detection, test command artifact tables) provides guardrails for the transition. They document the boundary now so it's enforced automatically later.

### CLAUDE.md Convention

Every folder that represents a **distinct scope** gets its own `CLAUDE.md`. This gives Claude Code immediate context when working in that area.

**Placement — create a CLAUDE.md for:**

- Top-level topic folders (`tools/`, `testing/`, `tasks/`, `projects/`, `docs/`, `scripts/`)
- Individual tasks (`tasks/{task-name}/`)
- Individual projects (`projects/{customer}/`)

**Placement — do NOT create CLAUDE.md for:**

- Implementation subfolders (`tools/export/`, `tools/audit/`, `testing/fixtures/`, etc.) — described by the parent's CLAUDE.md
- Data directories (`projects/wadnr/exports/`, `tasks/*/runs/`) — no context needed beyond the parent

**When creating a new scope folder**, always create its CLAUDE.md with: what this area is, how it's organized, key conventions, and relationship to other areas.

#### Content Standard: CLAUDE.md Is a Map, Not a Textbook

CLAUDE.md files are loaded into context automatically. Every line costs tokens. The goal is **just enough context to know where to go and what the rules are** — not to contain everything about the area.

**What belongs in a CLAUDE.md:**

| Content type         | Example                                       | Why it helps                     |
| -------------------- | --------------------------------------------- | -------------------------------- |
| Identity             | "What this area is" (1-2 sentences)           | Orients the session immediately  |
| Structure            | Subfolder table with purpose                  | Know where to look without `ls`  |
| Principles and rules | Sharing model, conventions, constraints       | Guides decisions without asking  |
| Quick reference      | Dev commands, common operations               | Copy-paste without searching     |
| Pointers             | "For bug details, see `analysis/overview.md`" | Directs to deeper info on demand |

**What does NOT belong in a CLAUDE.md:**

| Content type                    | Where it belongs instead                              | Why it hurts                                     |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| Detailed file inventories       | `ls`, `glob`                                          | Stale the moment a file is added/removed         |
| Code snippets and line numbers  | The source file itself, or analysis docs              | Goes stale constantly, bloats context            |
| Config file contents            | The config file (`.env.example.json`, `vv-config.js`) | Duplicates what `cat` provides in 1 command      |
| Full bug descriptions           | `tasks/*/analysis/bug-*.md`                           | Belongs in the analysis doc, link from CLAUDE.md |
| Per-test progress counts        | `matrix.md`, `test-data.js`                           | Changes every session, derivable in 1 command    |
| API tables and type definitions | The source code or reference docs                     | Duplicates what the code already says            |
| Historical narratives           | `CHANGELOG.md`, git log, analysis docs                | Not actionable context                           |

**Pruning rules:**

1. **One-command rule.** If the info can be derived with a single `ls`, `grep`, `cat`, or `git log` — don't store it. Link to the source instead.
2. **No duplication.** If it exists in an analysis doc, reference doc, or config file — link, don't copy. Information should live in exactly one place.
3. **Stale test.** If the info would go stale when a file is added, a test runs, or a line number changes — it doesn't belong.
4. **Compress on completion.** When a task completes, replace detailed progress with a summary + link to the final analysis.

**Size targets:**

| Tier         | Scope                               | Target                                         |
| ------------ | ----------------------------------- | ---------------------------------------------- |
| Root         | Entire repo                         | ~150 lines                                     |
| Scope        | `tools/`, `testing/`, `docs/`, etc. | ~30-60 lines                                   |
| Task/Project | Active workstream                   | Flexible, but apply pruning rules aggressively |

### .gitignore Note

The `.gitignore` has commented-out lines for `/projects/` and `tasks/**/runs/` etc. These are **documentation for the team repo** — uncomment them only when working directly on `emanueljofre/nodeV2` as a shared repo. While working solo, keep them commented so everything is versioned and backed up.

## Upstream Sync

```bash
# Fetch latest from VisualVault upstream
git fetch upstream
git merge upstream/master
```

Origin: `emanueljofre/nodeV2`
Upstream: `VisualVault/nodeJs-rest-client-library`
