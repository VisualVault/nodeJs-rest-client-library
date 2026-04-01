# Playwright Testing Guide

Patterns, architecture, and extension guide for the Playwright-based testing infrastructure.

> **Initial setup** (installation, credentials, running tests): [Dev Setup Guide](dev-setup.md#4-playwright-testing-setup)

## Overview

This project uses Playwright to automate browser testing of VisualVault's FormViewer. The primary use case is verifying date-handling behavior across field configurations and timezones, but the infrastructure is reusable for any VV form testing.

All Playwright infrastructure lives under `testing/` to keep the repo root clean for upstream sync.

**Two automation layers:**

1. **`/@-create-pw-date-test` command** (Claude Code) — interactive test case creation using `playwright-cli`. Opens a browser, verifies behavior live, generates documentation + appends test data.

2. **`npx playwright test`** — headless regression runner. Executes parameterized spec files (one per category) that loop over test case definitions in `testing/fixtures/test-data.js`.

## Generating New Test Cases

Use the Claude Code command to generate both a human-readable TC spec and a test data entry:

```
/@-create-pw-date-test 1-A-IST
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

| File                             | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `testing/playwright.config.js`   | 3 timezone projects, Chrome channel, auth state               |
| `testing/fixtures/vv-config.js`  | Form URLs, field config map (A-H), saved records              |
| `testing/fixtures/test-data.js`  | All test case definitions (data-driven parameterization)      |
| `testing/helpers/vv-form.js`     | Generic VV form helpers: navigation, field ops, value capture |
| `testing/helpers/vv-calendar.js` | Calendar-specific: popup date selection, typed input          |
| `testing/global-setup.js`        | Auto-login before test runs                                   |
| `testing/config/vv-config.json`  | VV credentials (gitignored)                                   |

## Extending to Non-Date Testing

The infrastructure is reusable for testing other VV form behaviors:

1. **Add helpers** to `testing/helpers/` (create new files for new domains, e.g., `vv-workflow.js`)
2. **Create new test directories** under `testing/` (e.g., `testing/workflow/`, `testing/documents/`)
3. **Add projects** to `testing/playwright.config.js` if you need different browser configs
4. **Reuse auth** — `global-setup.js` and `storageState` work for any VV page, not just forms
5. **Update `testDir`** in `playwright.config.js` or use multiple configs

The `gotoAndWaitForVVForm` pattern (networkidle + waitForFunction) applies to any VV Angular SPA page — just change the readiness condition.

## Troubleshooting

See [Dev Setup Guide — Troubleshooting](dev-setup.md#6-troubleshooting) for common issues (auth, timeouts, timezone mismatches, missing tools).
