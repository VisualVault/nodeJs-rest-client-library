# vv-ai-harness — VisualVault AI Harness & Orchestration Layer

## What This Repo Is

Fork of [VisualVault/nodeJs-rest-client-library](https://github.com/VisualVault/nodeJs-rest-client-library) under the `emanueljofre` GitHub account. Serves two purposes:

1. **Working environment** for investigating, testing, and documenting VisualVault platform issues (bugs, analysis, improvements)
2. **Development base** for future improvements to the Node.js microservices server and client library itself

## Repo Structure

```
vv-ai-harness/                         # AI HARNESS (this repo)
  lib/                                 # VV API wrapper (independent repo, gitignored)
  tools/                               # Shared CLI tooling (see tools/)
  testing/                             # Shared Playwright infrastructure (see testing/)
  scripts/                             # VV script examples and templates (see scripts/)
  research/                            # Cross-cutting investigations (see research/)
  docs/                                # Platform documentation (see docs/)
  projects/                            # Project workspaces (see projects/)
    {name}/                            #   Per-project workspace
      repo/                            #     GH repo clone (independent, gitignored)
      extracts/                        #     Extracted artifacts (gitignored)
      analysis/                        #     Investigation findings
      testing/                         #     Test execution records (gitignored)
```

## How the Server Works

**Microservices execution environment** — middleware between VisualVault servers and custom JavaScript business logic. VV sends a script via POST, the server creates a temp module with an injected authenticated `vvClient`, runs it, and returns results. See `scripts/` for execution modes and patterns.

## The VV Client API

The VV client provides managers for documents, forms, library, users, groups, sites, files, email, scripts, customQuery, scheduledProcess, reports, and projects. See `lib/VVRestApi/VVRestApiNodeJs/VVRestApi.js`.

## Authentication

OAuth token-based via `common.js`. Credentials live in root `.env.json` (gitignored), selected by `activeServer` + `activeCustomer` keys. `common.js` handles token acquisition and auto-refresh. See `.env.example.json` for structure.

## Write Safety — MANDATORY

This workspace connects to **live customer environments**. Some are production-like with real user data. Every Claude session MUST follow these rules.

### Environment Classification

| Environment           | Write Policy     | Rule                                                                                    |
| --------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| EmanuelJofre (vvdemo) | `unrestricted`   | Development sandbox. All writes allowed.                                                |
| WADNR (vv5dev)        | `allowlist`      | **Active client project.** Writes ONLY to forms/WS listed in `.env.json` `writePolicy`. |
| Any new customer      | assume `blocked` | **Ask the user** before writing anything. Never assume a new environment is safe.       |

### Rules for ALL Sessions

1. **Never create code that writes to a VV environment without explicit user instruction.** This includes: creating form records, calling web services that modify data, updating document index fields, or any POST/PUT/DELETE to VV APIs. Read-only operations (GET, navigation, DOM inspection) are always safe.

2. **Never bypass the guarded write paths.** All form saves MUST go through `testing/helpers/vv-form.js` `saveFormOnly()`. All Playwright API writes MUST use `testing/helpers/vv-request.js` `guardedPut`/`guardedPost`/`guardedDelete`. These are the **only** sanctioned write chokepoints — they enforce the write policy at runtime.

3. **Never use direct write patterns.** These are FORBIDDEN in any spec or tool:
    - `page.click()` on a Save/Submit/Delete button (use `saveFormOnly()` instead)
    - `request.put()` / `request.post()` for write operations (use `guardedPut`/`guardedPost`)
    - `page.evaluate(() => VV.Form.Save())` or any JS-level form submission
    - Direct `vvClient.forms.postForms()` without the caller having `readOnly`/`writePolicy` set

4. **Never modify these protected files without explicit user approval:**
    - `testing/fixtures/write-policy.js` — the central write guard
    - `testing/helpers/vv-request.js` — guarded request wrappers
    - `testing/helpers/vv-form.js` `saveFormOnly()` guard block — the 6 lines between `WRITE POLICY GUARD` comments
    - `lib/VVRestApi/VVRestApiNodeJs/common.js` — the API-layer write guard
    - `.env.json` `writePolicy` sections — the per-customer allowlists

5. **Never add entries to a customer's `writePolicy.forms` or `writePolicy.webServices`** without explicit user approval. Adding a template to the allowlist is equivalent to granting write access to that form in the customer's environment.

6. **New test specs that write** must import from the guarded helpers and document which environment they target. See `testing/CLAUDE.md` for the checklist.

### How the Write Policy Works

```
.env.json writePolicy        →  per-customer allowlist config
testing/fixtures/write-policy.js  →  central enforcement (assertFormWriteAllowed, assertApiWriteAllowed)
testing/helpers/vv-form.js        →  Playwright form save guard (extracts templateId from browser)
testing/helpers/vv-request.js     →  Playwright API write guard (guardedPut/Post/Delete)
lib/.../common.js                 →  Node.js REST client guard (HTTP-layer blocking)
```

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
npm run test:pw:regression   # Regression pipeline (run + generate artifacts)
npm run test:ws:regression   # WS regression pipeline
npm run test:dash:regression # Dashboard regression pipeline
```

## Web Services Testing

REST API date handling tests via the DateTestWSHarness. Run with `node tools/runners/run-ws-test.js --action WS-2`. See `research/date-handling/web-services/README.md`.

Scheduled process pattern validation via `node tools/runners/run-sp-test.js`. See `scripts/templates/scheduledprocess-pattern.js` for the canonical pattern.

## Platform Exploration & Version Monitoring

Playwright-based exploration of VV platform structure and version state. See `tools/CLAUDE.md` for details.

```bash
npm run explore              # Run exploration specs (headless)
npm run explore:headed       # Headed mode (visible browser)
npm run version:snapshot     # Capture current platform version state
npm run version:diff         # Compare two most recent snapshots
npm run env:profile          # Generate customer environment profile (HTTP, ~3s)
npm run env:profile:browser  # Generate profile with browser probes (~12s)
```

Environment profiles consolidate platform version, service configuration, and front-end library stack into `projects/{customer}/environment.json`. Use `--project <name>` to target a specific customer.

## Standards Review

Deterministic rule-based review of form template XML against codified standards. See `research/standards-review/` for task status and `docs/standards/form-template-standard.md` for the 18 atomic standards.

```bash
npm run review:forms -- --project wadnr        # Full review with file output
npm run review:forms -- --project wadnr --print # Stdout only
```

Reports written to `projects/{customer}/analysis/standards-review/` (summary.md, per-template reports, run-metadata.json).

## Active Research

See `research/` folder. Each investigation gets its own subfolder with analysis, test results, and working notes.

| Research                                                   | Status      | Description                                                                                             |
| ---------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| [date-handling](research/date-handling/)                   | In Progress | Cross-platform date handling bug investigation across Forms, Web Services, Dashboards, Document Library |
| [form-templates](research/form-templates/)                 | Active      | VV form template XML analysis, format documentation, and improved template generation                   |
| [extract-optimization](research/extract-optimization/)     | Active      | Extract pipeline speed: parallel extraction, revision tracking, API-first                               |
| [ws-naming](research/ws-naming/)                           | Active      | Web service naming — valid character investigation                                                      |
| [scheduled-process-logs](research/scheduled-process-logs/) | Complete    | SP execution mechanics: response.json vs postCompletion, platform timeout, log behavior                 |
| [standards-review](research/standards-review/)             | In Progress | Deterministic standards compliance tool for VV components (form templates first)                        |
| [unrelate-forms](research/unrelate-forms/)                 | Complete    | Client-side UnrelateForm script — API verification and reusable global function                         |
| [wadnr](projects/wadnr/)                                   | In Progress | WADNR client project: impact analysis, exported artifacts                                               |

## Principles

1. **Reproducibility.** Shared content must be reproducible — bug reports describe the bug, reproduction steps, and root cause. Anyone with a VV environment can verify.
2. **Environment-agnostic tooling.** Always prefer creating reusable scripts and tools over one-off solutions. Export, audit, inventory, and generator tools must work for any VV customer and environment. Hardcoded customer references go in `projects/`.
3. **Knowledge separation.** "Is this artifact true regardless of which customer or environment?" If yes → `research/`. If bound to a specific customer/environment → `projects/{customer}/`. Platform bugs, methodology, test specs, and expected behavior go in `research/`. Actual observed values, execution records, extracted artifacts, and customer-specific config go in `projects/{customer}/`.
4. **Sharing boundary.** `research/` content is shared (platform truth). `projects/` content is personal (customer/env-bound). No mixing — a file belongs to one or the other.
5. **Defense in depth.** Runtime guards are a safety net, not the primary defense. The primary defense is never writing unsafe code in the first place.
6. **Documentation as map.** CLAUDE.md files include: identity, structure, principles/rules, commands, pointers to deeper docs. Exclude: file inventories, code snippets, config contents, bug descriptions, API tables, historical narratives — link to the source instead.
7. **Documentation hygiene.** (1) If derivable with `ls`/`grep`/`cat`, link instead. (2) No duplication. (3) If it goes stale when a file is added, it doesn't belong. (4) Compress on task completion.

## Rules

### Write Safety

See the [Write Safety](#write-safety--mandatory) section for the 6 mandatory write rules, environment classification, and enforcement architecture.

### Upstream Protection

- **`lib/` is an independent repo** — changes to lib/ are committed inside `lib/.git`, not the harness. Treat with care: modifications affect test fidelity (local server must replicate production VV behavior).
- Never modify `lib/` files without explicit user approval.

### Content Boundaries

- **Customer data never reaches the team repo.** Exported scripts, templates, field inventories — all customer IP. Lives in `projects/{customer}/`.
- **Historical records are immutable.** Run files and test-case specs document state at execution time. Don't update paths or data retroactively.

### Browser Automation

- **Always use Playwright** for browser navigation, testing, and interaction — never the Claude Chrome extension (`mcp__claude-in-chrome__*` tools).
- **Always run Playwright in headless mode** unless the user explicitly requests headed mode.
- Use the `playwright-cli` skill and existing Playwright infrastructure in `testing/`.

### CLAUDE.md Standards

**Create a CLAUDE.md for:** top-level topic folders (`tools/`, `testing/`, `research/`, `projects/`, `docs/`, `scripts/`), individual research topics (`research/{topic}/`), individual projects (`projects/{customer}/`).

**Do NOT create CLAUDE.md for:** implementation subfolders (`tools/extract/`, `testing/fixtures/`, etc.), data directories (`projects/wadnr/extracts/`, `projects/*/testing/`).

**Size targets:** Root ~200 lines | Scope folders ~30-80 lines | Tasks/Projects flexible but aggressively pruned.

## Repository Architecture — AI Harness

This repo is an **AI harness** — a workbench that orchestrates work across multiple independent projects. Claude Code operates from the harness root and has access to shared tools, knowledge, and test infrastructure regardless of which project is active.

### Git Topology

```
HARNESS REPO (emanueljofre/vv-ai-harness)
  Tracks: tools/, testing/, docs/, scripts/, research/, .claude/, configs
          projects/CLAUDE.md, projects/*/CLAUDE.md, projects/*/test-assets.md
  Ignores: /lib/, /projects/*/repo/, /projects/*/extracts/,
           /projects/*/testing/, /projects/*/environment.json

LIB REPO (independent, lives at lib/)
  VV API wrapper — fork of VisualVault/nodeJs-rest-client-library
  Own .git, own remote, own upstream sync

PROJECT REPOS (independent, live at projects/{name}/repo/)
  Each project's deployable code — own .git, own GH remote
```

### What's Tracked Where

| Artifact                  | Harness repo | Private remote | Project repo | lib repo |
| ------------------------- | ------------ | -------------- | ------------ | -------- |
| Shared tools, tests, docs | yes          | yes            |              |          |
| Research investigations   | yes          | yes            |              |          |
| Claude commands           | yes          | yes            |              |          |
| Project CLAUDE.md         | yes          | yes            |              |          |
| Project extracts/analysis |              | yes            |              |          |
| Project test records      |              | yes            |              |          |
| Deployable project code   |              |                | yes          |          |
| VV API wrapper            |              |                |              | yes      |

### Shared vs. Project-Specific

Work output goes to one of four destinations:

- **Deployable code** → project's GH repo (`projects/{name}/repo/`)
- **Project-specific tools & research** → project workspace (`projects/{name}/analysis/` or `tools/`)
- **Workspace artifacts** (extracts, test records) → untracked locally, backed up via private remote
- **Shared outputs** (reusable tools, standards, platform docs) → harness repo

**Promotion flow:** project-specific → shared when a second project needs it or it describes platform behavior. The deciding question: "Would a second project ever need this?"

### Bootstrap (new machine)

```bash
git clone <harness-url> vv-ai-harness
cd vv-ai-harness && npm install
cd lib && git clone <api-wrapper-url> .       # restore VV API wrapper
cd ../projects/wadnr/repo && git clone <url> . # restore project repos (if any)
```

### lib/ Upstream Sync

`lib/` is now an independent repo. Sync with upstream inside `lib/`:

```bash
cd lib
git remote add upstream https://github.com/VisualVault/nodeJs-rest-client-library.git
git fetch upstream && git merge upstream/master
```
