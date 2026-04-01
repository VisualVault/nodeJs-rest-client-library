# Date-Handling Playwright Test Suite

Automated regression tests for VisualVault Forms calendar field date-handling behavior. Verifies how dates are stored, transformed, and returned across 8 field configurations and 3 timezones.

## Why This Exists

The VisualVault platform has **7 confirmed date-handling bugs** affecting how calendar fields store and return dates depending on field configuration and user timezone. This test suite:

- Runs the same scenarios across BRT (UTC-3), IST (UTC+5:30), and UTC+0 to expose timezone-dependent bugs
- Covers ~242 test slots across 13 categories (popup, typed input, reload, SetFieldValue, GetFieldValue, round-trip, etc.)
- Produces both human-readable test documentation (in `tasks/date-handling/`) and reusable Playwright specs (here)

Full investigation context: `tasks/date-handling/CLAUDE.md`
Bug analysis: `tasks/date-handling/forms-calendar/analysis.md`
Test matrix: `tasks/date-handling/forms-calendar/matrix.md`

---

## Quick Start

### Prerequisites

- Node.js >= 20
- `@playwright/test` (already in devDependencies)
- Chrome browser (Playwright uses `channel: 'chrome'`)
- `playwright-cli` global install (for the `@-create-pw-date-test` command): `npm install -g @playwright/cli@latest`

### Setup

1. **Install dependencies** (if not already done):

    ```bash
    npm install
    npx playwright install chromium
    ```

2. **Create VV credentials file** — copy the example and fill in your credentials:

    ```bash
    cp .playwright/vv-config.example.json .playwright/vv-config.json
    ```

    Edit `.playwright/vv-config.json` with your VisualVault username, password, and customer alias. See `.playwright/README.md` for field descriptions.

3. **Run tests**:
    ```bash
    npm run test:pw:brt    # Run BRT timezone tests
    npm run test:pw        # Run all timezone projects
    ```

The first run triggers `global-setup.js` which logs into VV and saves auth cookies. Subsequent runs reuse the saved state for up to 1 hour.

---

## Architecture

This project uses **two automation layers** that share the same `.playwright/` config:

```
Layer 1: @-create-pw-date-test command (Claude Code)
  Uses: playwright-cli (interactive CLI)
  Purpose: Live verification + artifact generation
  Outputs:
    - tasks/.../test-cases/tc-{id}.md   (human-readable TC spec)
    - tasks/.../runs/tc-{id}-run-N.md   (immutable execution record)
    - tasks/.../summaries/tc-{id}.md    (run history + interpretation)
    - tests/date-handling/tc-{id}.spec.js (reusable Playwright test)
  Auth state: .playwright/auth-state.json

Layer 2: npx playwright test (CI/regression)
  Uses: @playwright/test (Node.js API)
  Purpose: Re-run generated specs headlessly for regression
  Outputs: test-results/, playwright-report/
  Auth state: .playwright/auth-state-pw.json

Shared config:
  .playwright/vv-config.json      VV credentials
  .playwright/tz-{tz}.json        Timezone overrides (CLI only)
  playwright.config.js            Test runner config (3 TZ projects)
```

**Why two layers?** The command (Layer 1) is for _exploratory testing_ — Claude opens a browser, interacts with VV live, captures actual behavior, and generates documentation. The test runner (Layer 2) is for _regression testing_ — re-running the generated specs to detect if VV behavior changes.

---

## File Reference

| File              | Purpose                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `vv-config.js`    | Shared constants: form template URL, field configuration map (A-H), saved record URLs     |
| `vv-helpers.js`   | Page-level helpers: form loading, field verification, value capture, calendar interaction |
| `global-setup.js` | Runs once before all tests: logs into VV, saves auth cookies                              |
| `tc-*.spec.js`    | Generated test files (one per test case + timezone combination)                           |

### External Config

| File                          | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `playwright.config.js` (root) | 3 timezone projects (BRT/IST/UTC0), auth state, Chrome channel |
| `.playwright/vv-config.json`  | VV credentials (gitignored)                                    |
| `.playwright/tz-*.json`       | Timezone overrides for `playwright-cli` (Layer 1 only)         |

---

## Field Configuration Matrix

All tests target one of 8 field configurations defined by three boolean flags on VV calendar fields:

| Config | enableTime | ignoreTimezone | useLegacy | Field Name  | What It Tests                                    |
| :----: | :--------: | :------------: | :-------: | ----------- | ------------------------------------------------ |
|   A    |   false    |     false      |   false   | DataField7  | Date-only baseline. Bug #7 surface in UTC+       |
|   B    |   false    |      true      |   false   | DataField10 | Date-only + ignoreTimezone. Same Bug #7 exposure |
|   C    |    true    |     false      |   false   | DataField6  | DateTime with timezone. UTC-aware storage        |
|   D    |    true    |      true      |   false   | DataField5  | **Primary bug surface**: Bug #5 (fake Z), Bug #6 |
|   E    |   false    |     false      |   true    | DataField12 | Legacy date-only. Bug #2, Bug #4                 |
|   F    |   false    |      true      |   true    | DataField11 | Legacy date-only + ignoreTimezone                |
|   G    |    true    |     false      |   true    | DataField14 | Legacy DateTime                                  |
|   H    |    true    |      true      |   true    | DataField13 | Legacy DateTime + ignoreTimezone                 |

**Flag definitions:**

- `enableTime` — field captures time in addition to date (shows time picker in popup, stores datetime vs date-only)
- `ignoreTimezone` — VV's timezone handling flag. When true + enableTime, triggers Bug #5 (`GetFieldValue` appends fake `Z` to local-time strings)
- `useLegacy` — uses the V1 legacy code path for save/load. Legacy popup stores raw `toISOString()` (UTC datetime) while modern path stores local-time strings

Each config also has a `enableInitialValue` variant (for Preset Date / Current Date tests), but the base tests use `enableInitialValue=false`.

---

## Timezone Projects

Tests run across 3 timezone contexts to expose timezone-dependent bugs:

| Project | IANA Name         | Offset   | Why                                                                                                                |
| ------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| BRT     | America/Sao_Paulo | UTC-3    | **UTC- control**: local midnight is same calendar day in UTC. Most bugs hidden.                                    |
| IST     | Asia/Calcutta     | UTC+5:30 | **UTC+ exposure**: local midnight is previous day in UTC. Bug #7 visible. Non-integer offset stress-tests parsing. |
| UTC0    | Etc/GMT           | UTC+0    | **Boundary control**: local = UTC. Verifies bugs are timezone-dependent, not universal.                            |

Playwright's `timezoneId` context option simulates these timezones at the browser level — no system timezone changes or Chrome restarts needed. `new Date().toString()` inside the page returns the simulated timezone.

**To add a new timezone:**

1. Add a project to `playwright.config.js` with a `testMatch` regex matching your TZ suffix
2. Generate test files with the matching suffix (e.g., `tc-1-A-JST.spec.js` for `JST`)
3. Add a TZ config file at `.playwright/tz-{tz}.json` for the CLI workflow

---

## Auth Flow

### How It Works

`global-setup.js` handles VV authentication before tests run:

1. Checks if `.playwright/auth-state-pw.json` exists and is less than 1 hour old
2. If fresh: skips login (reuses saved cookies)
3. If missing or stale: launches a browser, navigates to VV login, fills credentials from `.playwright/vv-config.json`, saves cookies after successful login

### Two Auth State Files

| File                             | Used By                                    | Created By                  |
| -------------------------------- | ------------------------------------------ | --------------------------- |
| `.playwright/auth-state.json`    | `playwright-cli` (Layer 1 — the command)   | `playwright-cli state-save` |
| `.playwright/auth-state-pw.json` | `@playwright/test` (Layer 2 — test runner) | `global-setup.js`           |

They are separate because `playwright-cli` and `@playwright/test` manage browser contexts independently. Both are gitignored.

### Force Re-Login

Delete the auth state file and re-run:

```bash
rm .playwright/auth-state-pw.json
npm run test:pw:brt
```

---

## Running Tests

```bash
# All timezone projects
npm run test:pw

# Single timezone
npm run test:pw:brt
npm run test:pw:ist
npm run test:pw:utc0

# Headed mode (visible browser — useful for debugging)
npm run test:pw:headed

# Open HTML report after a run
npm run test:pw:report

# Run a specific test file
npx playwright test tc-1-A-BRT --project=BRT
```

---

## Adding New Tests

### Path 1: Via the Command (Recommended)

The `/@-create-pw-date-test <category-id>` command generates both:

- A markdown TC spec in `tasks/date-handling/forms-calendar/test-cases/`
- A `.spec.js` file here in `tests/date-handling/`

```
/@-create-pw-date-test 2-D-IST
```

This opens a browser, runs the test live, captures actual behavior, and generates all artifacts.

### Path 2: Manual Creation

Copy an existing `.spec.js` file and modify:

1. Update the header comments (config, timezone, expected values, bugs)
2. Change `CONFIG`, `EXPECTED_RAW`, `EXPECTED_API`, `EXPECTED_TZ_OFFSET` constants
3. Replace the scenario action (use the appropriate helper from `vv-helpers.js`)
4. Name the file `tc-{category}-{config}-{tz}.spec.js` to match the project `testMatch` pattern

---

## Debugging

### Form Didn't Load (timeout on `waitForVVForm`)

The VV Angular SPA requires `networkidle` before `waitForFunction` can detect `VV.Form`. If the form loads slowly:

- Check network connectivity to `vvdemo.visualvault.com`
- Try headed mode: `npm run test:pw:headed`
- Increase timeout in `gotoAndWaitForVVForm` (default: 60s)

### Wrong Timezone in Browser

If `new Date().toString()` doesn't match the expected offset:

- Verify `playwright.config.js` has the correct `timezoneId` for the project
- Ensure the test file suffix matches the project (e.g., `-BRT.spec.js` for the BRT project)

### Auth Expired / Login Redirect

If tests fail with a login page instead of the form:

- Delete `.playwright/auth-state-pw.json` and re-run
- Verify credentials in `.playwright/vv-config.json`
- Check if the VV instance is accessible

### Field Not Found

`verifyField()` throws "No field matches config" when:

- The VV form template doesn't have a field with the expected flags
- The form hasn't fully loaded (check that `waitForVVForm` completed)
- The field configuration on the VV form was changed

### Calendar Popup Month Selection

The VV calendar uses a scrollable grid with `tbody` sections per month. `selectDateViaPopup()`:

1. Clicks the toggle button (tries both "Toggle calendar" and "Toggle popup" labels)
2. Scrolls the month list to the target month
3. Finds the correct `tbody` by matching the "Month Year" header text
4. Clicks the day cell within that specific section

If it clicks the wrong month's day, the `tbody` header matching logic may need updating for a new calendar version.
