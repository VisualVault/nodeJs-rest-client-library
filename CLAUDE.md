# nodeV2 — VisualVault Node.js Development & Testing Workspace

## What This Repo Is

Fork of [VisualVault/nodeJs-rest-client-library](https://github.com/VisualVault/nodeJs-rest-client-library) under the `emanueljofre` GitHub account. Serves two purposes:

1. **Working environment** for investigating, testing, and documenting VisualVault platform issues (bugs, analysis, improvements)
2. **Development base** for future improvements to the Node.js microservices server and client library itself

## Repo Structure

```
nodeV2/
  CHANGELOG.md                       # Server/library changes (lib/ scope only)
  lib/VVRestApi/VVRestApiNodeJs/     # The Node.js microservices server
    app.js                           # Express entry point (port 3000)
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
    server-scripts/                  # Scheduled/server-side scripts
    test-scripts/                    # Local test scripts
  docs/                              # Shared documentation
    architecture/                    # Platform architecture, component diagrams, data flow
    standards/                       # Coding standards, patterns, conventions
    guides/                          # How-to guides, onboarding, troubleshooting
    reference/                       # API reference, config options, field types
  tasks/                             # Investigation and task workspace
    README.md                        # Task index and structure guide
    date-handling/                   # Active: cross-platform date bug investigation
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

- Scripts provide credentials via `getCredentials()`
- `common.js` handles token acquisition and auto-refresh (30s before expiry)
- All API calls use Bearer token in Authorization header

## Development Commands

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

- **ESLint** (`eslint.config.js`) — flat config, CommonJS, integrated with Prettier
- **Prettier** (`.prettierrc`) — single quotes, 4-space tabs, 120 print width
- **Husky + lint-staged** — pre-commit hook runs ESLint fix + Prettier on staged files

## Active Tasks

See `tasks/` folder. Each task gets its own subfolder with analysis, test results, and working notes.

| Task                                  | Status      | Description                                                                                               |
| ------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| [date-handling](tasks/date-handling/) | In Progress | Cross-platform date handling bug investigation across Forms, Web Services, Dashboards, Reports, Workflows |
| [workflow-test](tasks/workflow-test/) | Not Started | Workflow microservice test script template for scheduled process testing                                  |

## Platform Documentation

Architecture and reference docs for the VisualVault platform itself (URL patterns, navigation, admin sections, how the Node.js server integrates) are in `docs/`:

- **[Platform Architecture](docs/architecture/visualvault-platform.md)** — URL anatomy, all navigation sections and their paths, Enterprise Tools (Microservices/Scheduled Services/Queries), demo environment GUIDs, how nodeV2 connects to VV
- **[Form Fields Reference](docs/reference/form-fields.md)** — Calendar field config properties, popup modal behavior, V1/V2 code path, VV.Form console API, known bugs summary
- **[VV.Form API Reference](docs/reference/vv-form-api.md)** — Full VV object structure: properties, methods, sub-objects (FormPartition, calendarValueService, Global, currentUser, FormsDataService), field definitions, automation patterns

## Upstream Sync

```bash
# Fetch latest from VisualVault upstream
git fetch upstream
git merge upstream/master
```

Origin: `emanueljofre/nodeV2`
Upstream: `VisualVault/nodeJs-rest-client-library`
