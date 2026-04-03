# Playwright Testing Guide

Patterns, architecture, and extension guide for the Playwright-based testing infrastructure.

> **Initial setup** (installation, credentials, running tests): [Dev Setup Guide](dev-setup.md#4-playwright-testing-setup)

## Overview

This project uses Playwright to automate browser testing of VisualVault's FormViewer. The primary use case is verifying date-handling behavior across field configurations and timezones, but the infrastructure is reusable for any VV form testing.

All Playwright infrastructure lives under `testing/` to keep the repo root clean for upstream sync.

**Two automation layers:**

1. **`/@-test-forms-date-pw` command** (Claude Code) — interactive test case creation using `playwright-cli`. Opens a browser, verifies behavior live, generates documentation + appends test data.

2. **`npx playwright test`** — headless regression runner. Executes parameterized spec files (one per category) that loop over test case definitions in `testing/fixtures/test-data.js`.

## Generating New Test Cases

Use the Claude Code command to generate both a human-readable TC spec and a test data entry:

```
/@-test-forms-date-pw 1-A-IST
```

This command:

1. Opens a browser with the target timezone
2. Navigates to the DateTest form and runs precondition checks
3. Executes the test scenario (calendar popup, typed input, etc.)
4. Captures actual values and compares against expected
5. Generates:
    - `tasks/date-handling/forms-calendar/test-cases/tc-1-A-IST.md` (markdown spec)
    - `tasks/date-handling/forms-calendar/runs/tc-1-A-IST-run-N.md` (execution record)
    - `tasks/date-handling/forms-calendar/summaries/tc-1-A-IST.md` (run history)
    - Appends test case entry to `testing/fixtures/test-data.js`
6. Updates the test matrix (`tasks/date-handling/forms-calendar/matrix.md`)

## Key Files

| File                             | Purpose                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| `testing/playwright.config.js`   | TZ × browser matrix (12 projects: 4 TZ × 3 browsers), auth state     |
| `testing/fixtures/vv-config.js`  | Form URLs, field config map (A-H), record definitions, saved records |
| `testing/fixtures/test-data.js`  | All test case definitions (data-driven parameterization)             |
| `testing/helpers/vv-form.js`     | Generic VV form helpers: navigation, field ops, value capture, save  |
| `testing/helpers/vv-calendar.js` | Calendar helpers: popup (date-only + DateTime), typed input, legacy  |
| `testing/global-setup.js`        | Auto-login + create saved records via browser UI (per-TZ, cached 1h) |
| `testing/config/vv-config.json`  | VV credentials (gitignored)                                          |

## Extending to Non-Date Testing

The infrastructure is reusable for testing other VV form behaviors:

1. **Add helpers** to `testing/helpers/` (create new files for new domains, e.g., `vv-workflow.js`)
2. **Create new test directories** under `testing/` (e.g., `testing/workflow/`, `testing/documents/`)
3. **Add projects** to `testing/playwright.config.js` (the TZ × browser matrix auto-generates all combinations)
4. **Reuse auth** — `global-setup.js` and `storageState` work for any VV page, not just forms
5. **Update `testDir`** in `playwright.config.js` or use multiple configs

The `gotoAndWaitForVVForm` pattern (networkidle + waitForFunction) applies to any VV Angular SPA page — just change the readiness condition.

## Regression Pipelines

Two parallel pipelines for automated test execution + artifact generation. Same outcomes, different execution engines.

### Forms Pipeline (Playwright)

Runs browser-based regression tests and generates Layer 1 artifacts. Built on Playwright spec files + `test-data.js`.

### Architecture

```
run-regression.js (orchestrator)
  → npx playwright test + regression-reporter.js → regression-results-latest.json
  → generate-artifacts.js → run files, summaries, matrix.md, results.md
```

Three files in `testing/`:

- `reporters/regression-reporter.js` — custom Playwright reporter that captures results + actual values to JSON
- `scripts/run-regression.js` — CLI entry point (runs tests then triggers artifact generation)
- `scripts/generate-artifacts.js` — reads JSON, creates/updates markdown artifacts

### Usage

```bash
# Full pipeline: run tests in Firefox, generate artifacts
npm run test:pw:regression -- --browser firefox

# Specific TZ + browser
npm run test:pw:regression -- --project BRT-firefox

# Combine filters
npm run test:pw:regression -- --browser webkit --tz IST

# Generate artifacts from last results (no test execution)
npm run test:pw:regression -- --artifacts-only

# Run tests only (no artifact generation)
npm run test:pw:regression -- --browser chromium --skip-artifacts

# Headed mode (visible browser, for debugging)
npm run test:pw:regression -- --browser firefox --headed
```

### Flags

| Flag               | Value                           | Description                                         |
| ------------------ | ------------------------------- | --------------------------------------------------- |
| `--browser`        | `chromium`, `firefox`, `webkit` | Run all TZs for that browser                        |
| `--tz`             | `BRT`, `IST`, `UTC0`            | Run all browsers for that TZ                        |
| `--project`        | e.g. `BRT-firefox`              | Exact Playwright project (supports `*` wildcards)   |
| `--artifacts-only` | _(flag)_                        | Skip tests, generate artifacts from last saved JSON |
| `--skip-artifacts` | _(flag)_                        | Run tests only, don't generate artifacts            |
| `--headed`         | _(flag)_                        | Show browser window                                 |

At least one of `--browser`, `--tz`, or `--project` is required (unless using `--artifacts-only`).

### Artifacts generated per executed test

| Artifact      | Path                                                         | Behavior                                     |
| ------------- | ------------------------------------------------------------ | -------------------------------------------- |
| Run file      | `tasks/date-handling/forms-calendar/runs/tc-{id}-run-{N}.md` | New file (immutable), increments N           |
| Summary       | `tasks/date-handling/forms-calendar/summaries/tc-{id}.md`    | Appends to Run History table, updates status |
| Matrix row    | `tasks/date-handling/forms-calendar/matrix.md`               | Updates Status + Run Date columns            |
| Session entry | `tasks/date-handling/forms-calendar/results.md`              | One-line index entry per test                |

### Adding new test cases

1. Add entries to `testing/fixtures/test-data.js`
2. Create a `cat-*.spec.js` if the category is new
3. Run the pipeline — new entries are picked up automatically

### Standalone artifact generation

The generator can also run independently with a custom input file:

```bash
node testing/scripts/generate-artifacts.js --input path/to/results.json
```

### WS Pipeline (Node.js)

Runs API-based regression tests via `run-ws-test.js` and generates equivalent artifacts. No browser needed — tests call the VV REST API directly.

```
run-ws-regression.js (orchestrator)
  → TZ={tz} node run-ws-test.js --action WS-N → JSON per invocation
  → generate-ws-artifacts.js → batch run files, summaries, matrix.md, results.md
```

#### Usage

```bash
# Run all WS tests for a specific TZ
npm run test:ws:regression -- --tz BRT

# Run a specific action
npm run test:ws:regression -- --action WS-1

# Specific action + TZ
npm run test:ws:regression -- --action WS-1 --tz IST

# Generate artifacts from last results
npm run test:ws:regression -- --artifacts-only

# Run tests only
npm run test:ws:regression -- --tz BRT --skip-artifacts
```

#### Flags

| Flag               | Value                 | Description                         |
| ------------------ | --------------------- | ----------------------------------- |
| `--action`         | `WS-1` through `WS-9` | Run specific action category        |
| `--tz`             | `BRT`, `IST`, `UTC`   | Run specific timezone               |
| `--artifacts-only` | _(flag)_              | Skip tests, generate from last JSON |
| `--skip-artifacts` | _(flag)_              | Run tests only                      |

#### Key differences from Forms pipeline

| Aspect        | Forms                           | WS                                      |
| ------------- | ------------------------------- | --------------------------------------- |
| Execution     | Playwright (browser)            | Node.js (API calls)                     |
| TZ simulation | `timezoneId` in browser context | `TZ=` env var                           |
| Run files     | Per-test (`tc-{id}-run-{N}.md`) | Per-batch (`ws-1-brt-batch-run-{N}.md`) |
| Test data     | `testing/fixtures/test-data.js` | Matrix.md + harness args                |

### Dashboard Pipeline (Playwright)

Captures the DateTest Dashboard grid (Telerik RadGrid, server-rendered) and compares cell values against matrix Expected. No TZ dimension — server-rendered dates are timezone-independent.

```bash
# Run all dashboard tests
npm run test:dash:regression

# Specific category
npm run test:dash:regression -- --category DB-1

# Generate artifacts from last capture
npm run test:dash:regression -- --artifacts-only

# Capture only, no artifacts
npm run test:dash:regression -- --skip-artifacts
```

| Flag               | Description                           |
| ------------------ | ------------------------------------- |
| `--category DB-N`  | Run specific category only            |
| `--artifacts-only` | Skip browser, generate from last JSON |
| `--skip-artifacts` | Capture grid only                     |
| `--headed`         | Show browser window                   |

**Coverage**: DB-1/2/3 (24 grid-value tests) run automatically. DB-4 (sort), DB-5 (filter), DB-6 (cross-layer), DB-8 (TZ) require specialized scripts — marked as SKIPPED in regression output.

## Troubleshooting

See [Dev Setup Guide — Troubleshooting](dev-setup.md#6-troubleshooting) for common issues (auth, timeouts, timezone mismatches, missing tools).
