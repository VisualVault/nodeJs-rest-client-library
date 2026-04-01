# Playwright Testing Guide

How to set up and use the Playwright-based testing infrastructure for VisualVault platform testing.

## Overview

This project uses Playwright to automate browser testing of VisualVault's FormViewer. The primary use case is verifying date-handling behavior across field configurations and timezones, but the infrastructure is reusable for any VV form testing.

**Two automation layers:**

1. **`/@-create-pw-date-test` command** (Claude Code) — interactive test case creation using `playwright-cli`. Opens a browser, verifies behavior live, generates documentation + reusable test specs.

2. **`npx playwright test`** — headless regression runner. Executes the generated `.spec.js` files to detect if VV behavior changes.

## Installation

```bash
# Install project dependencies (includes @playwright/test)
npm install

# Install browser binary
npx playwright install chromium

# Install playwright-cli globally (for the command workflow)
npm install -g @playwright/cli@latest
```

## VV Credentials Setup

```bash
cp .playwright/vv-config.example.json .playwright/vv-config.json
```

Edit `.playwright/vv-config.json` with your VisualVault credentials:

```json
{
    "instance": "vvdemo",
    "loginUrl": "https://vvdemo.visualvault.com",
    "username": "your.email@company.com",
    "password": "your-password",
    "customerAlias": "YourCustomerAlias",
    "databaseAlias": "Main"
}
```

See `.playwright/README.md` for field descriptions.

## Running Tests

```bash
npm run test:pw           # All timezone projects (BRT, IST, UTC0)
npm run test:pw:brt       # BRT (UTC-3) only
npm run test:pw:ist       # IST (UTC+5:30) only
npm run test:pw:utc0      # UTC+0 only
npm run test:pw:headed    # Visible browser (debugging)
npm run test:pw:report    # Open HTML report
```

The first run triggers `global-setup.js` which logs into VV and saves auth cookies.

## Generating New Test Cases

Use the Claude Code command to generate both a human-readable TC spec and a Playwright test:

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
    - `tests/date-handling/tc-1-A-IST.spec.js` (reusable Playwright test)
6. Updates the test matrix (`tasks/date-handling/forms-calendar/matrix.md`)

## Key Files

| File                                  | Purpose                                                     |
| ------------------------------------- | ----------------------------------------------------------- |
| `playwright.config.js`                | 3 timezone projects, Chrome channel, auth state             |
| `tests/date-handling/vv-config.js`    | Form URLs, field config map (A-H)                           |
| `tests/date-handling/vv-helpers.js`   | Page helpers: form loading, field ops, calendar interaction |
| `tests/date-handling/global-setup.js` | Auto-login before test runs                                 |
| `.playwright/vv-config.json`          | VV credentials (gitignored)                                 |

## Extending to Non-Date Testing

The infrastructure is reusable for testing other VV form behaviors:

1. **Add helpers** to `vv-helpers.js` for new field types or interactions
2. **Create new test files** in `tests/` (organize by feature: `tests/workflow/`, `tests/documents/`, etc.)
3. **Add projects** to `playwright.config.js` if you need different browser configs
4. **Reuse auth** — `global-setup.js` and `storageState` work for any VV page, not just forms

The `gotoAndWaitForVVForm` pattern (networkidle + waitForFunction) applies to any VV Angular SPA page — just change the readiness condition.

## Troubleshooting

| Problem                      | Solution                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| Tests fail with login page   | Delete `.playwright/auth-state-pw.json` and re-run                   |
| Form shows loading spinner   | Increase timeout in `gotoAndWaitForVVForm` or check network          |
| Wrong timezone in assertions | Verify test file suffix matches the project name (-BRT, -IST, -UTC0) |
| "No field matches config"    | Form didn't load fully, or field config changed on VV side           |
| Calendar clicks wrong month  | The `selectDateViaPopup` tbody header matching may need updating     |
| `playwright-cli` not found   | `npm install -g @playwright/cli@latest`                              |
