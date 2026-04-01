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
  testing/                           # Playwright testing infrastructure
    playwright.config.js             # 3-project config (BRT, IST, UTC0)
    global-setup.js                  # Auto-login + create saved records before test runs
    config/                          # Credentials, TZ configs, auth state
    helpers/                         # Reusable page helpers
      vv-form.js                     # Generic VV form automation (11 functions)
      vv-calendar.js                 # Calendar popup + typed input helpers
    fixtures/                        # Shared test data and config
      vv-config.js                   # FIELD_MAP, form URLs, saved records
      test-data.js                   # All test case definitions (data-driven)
    date-handling/                   # Date-handling test specs (1 per category)
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

1. **`/@-create-pw-date-test <id>`** — interactive `playwright-cli` sessions for live verification + artifact generation
2. **`npx playwright test`** — headless regression runner for parameterized spec files

```bash
npm run test:pw              # All projects (3 TZ × 3 browsers)
npm run test:pw:brt          # BRT — all browsers
npm run test:pw:ist          # IST — all browsers
npm run test:pw:chromium     # Chromium — all TZs
npm run test:pw:firefox      # Firefox — all TZs
npm run test:pw:webkit       # WebKit (Safari) — all TZs
npm run test:pw:headed       # Headed mode (visible browser)
npm run test:pw:report       # Open HTML report
```

**Test infrastructure** (in `testing/`):

- `fixtures/vv-config.js` — form URLs, field config map (Configs A-H), saved records
- `fixtures/vv-config.js` — form URLs, field config map (A-H), record definitions, saved records
- `fixtures/test-data.js` — all test case definitions as structured data (data-driven)
- `helpers/vv-form.js` — generic VV form helpers: navigation, field verification, value capture, save
- `helpers/vv-calendar.js` — calendar-specific: popup selection (date-only + DateTime), typed input
- `global-setup.js` — auto-login + create saved records via browser UI (per-TZ, cached 1h)
- `date-handling/cat-*.spec.js` — parameterized test files (one per category, loops over test-data)

Full documentation: [`testing/date-handling/README.md`](testing/date-handling/README.md) | [`docs/guides/playwright-testing.md`](docs/guides/playwright-testing.md)

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
