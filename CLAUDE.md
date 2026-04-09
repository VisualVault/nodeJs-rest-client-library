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
  tools/                           # Standalone CLI tooling: extract, explore, runners, audit, inventory, generators (see tools/)
  testing/                         # Playwright test infrastructure: specs, helpers, fixtures, pipelines (see testing/)
  tasks/                           # Cross-cutting investigations and analysis (see tasks/)
  projects/                        # Customer workspaces with extracted artifacts (see projects/)
  docs/                            # Platform documentation: architecture, standards, guides, reference (see docs/)
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

Runtime guards are a **safety net**, not the primary defense. The primary defense is following rules 1-6 above so unsafe code is never written in the first place.

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

## Platform Exploration & Version Monitoring

Playwright-based exploration of VV platform structure and version state. See `tools/CLAUDE.md` for details.

```bash
npm run explore              # Run exploration specs (headless)
npm run explore:headed       # Headed mode (visible browser)
npm run version:snapshot     # Capture current platform version state
npm run version:diff         # Compare two most recent snapshots
```

## Active Tasks

See `tasks/` folder. Each task gets its own subfolder with analysis, test results, and working notes.

| Task                                                | Status      | Description                                                                                             |
| --------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| [date-handling](tasks/date-handling/)               | In Progress | Cross-platform date handling bug investigation across Forms, Web Services, Dashboards, Document Library |
| [form-templates](tasks/form-templates/)             | Active      | VV form template XML analysis, format documentation, and improved template generation                   |
| [extract-optimization](tasks/extract-optimization/) | Active      | Extract pipeline speed: parallel extraction, revision tracking, API-first                               |
| [wadnr](projects/wadnr/)                            | In Progress | WADNR client project: impact analysis, exported artifacts                                               |

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

- Implementation subfolders (`tools/extract/`, `testing/fixtures/`, etc.) — described by the parent
- Data directories (`projects/wadnr/extracts/`, `tasks/*/runs/`) — no context needed beyond the parent

#### Content Standard: CLAUDE.md Is a Map, Not a Textbook

**Include:** identity (1-2 sentences), structure (subfolder purposes), principles/rules, quick reference commands, pointers to deeper docs. **Exclude:** detailed file inventories, code snippets, config contents, full bug descriptions, per-test counts, API tables, historical narratives — link to the source instead.

**Pruning rules:** (1) One-command rule — if derivable with `ls`/`grep`/`cat`, link instead. (2) No duplication. (3) If it goes stale when a file is added, it doesn't belong. (4) Compress on task completion.

**Size targets:** Root ~200 lines (includes Write Safety) | Scope folders ~30-80 lines | Tasks/Projects flexible but aggressively pruned.

## Upstream Sync & Protection

`lib/VVRestApi/` is sourced from upstream with intentional local enhancements (write-policy guards, options plumbing). **Modifications affect test fidelity** — the local server must replicate production VV behavior for WS and scheduled process testing.

### Protection layers

1. **Pre-commit guard** (`.husky/pre-commit`) — blocks commits to `lib/` files unless on the allowlist or `UPSTREAM_OK=1` is set
2. **Allowlist** (`.husky/upstream-allowlist`) — declares which `lib/` paths are locally maintained (currently: `routes/`)
3. **CI drift report** (`.github/workflows/upstream-guard.yml`) — reports `lib/` divergence from upstream on PRs (informational, non-blocking)
4. **Gitattributes** — `lib/VVRestApi/**` marked `upstream-tracked` for tooling visibility

### Rules

- **Never modify `lib/` files without explicit user approval.** This mirrors the Write Safety rules for customer environments.
- To commit a protected file: `UPSTREAM_OK=1 git commit ...`
- To permanently allow a path: add it to `.husky/upstream-allowlist`

### Sync commands

```bash
git fetch upstream
git merge upstream/master
```

Origin: `emanueljofre/nodeV2`
Upstream: `VisualVault/nodeJs-rest-client-library`
