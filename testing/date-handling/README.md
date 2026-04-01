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

> Environment setup (Node.js, Playwright, credentials): [Dev Setup Guide](../../docs/guides/dev-setup.md#4-playwright-testing-setup)

```bash
npm run test:pw:brt    # Run BRT timezone tests
npm run test:pw        # Run all timezone projects
```

---

## Architecture

This project uses **two automation layers** that share the same `testing/config/` directory:

```
Layer 1: @-create-pw-date-test command (Claude Code)
  Uses: playwright-cli (interactive CLI)
  Purpose: Live verification + artifact generation
  Outputs:
    - tasks/.../test-cases/tc-{id}.md   (human-readable TC spec)
    - tasks/.../runs/tc-{id}-run-N.md   (immutable execution record)
    - tasks/.../summaries/tc-{id}.md    (run history + interpretation)
    - testing/fixtures/test-data.js     (appends test case definition)
  Auth state: testing/config/auth-state.json

Layer 2: npx playwright test (CI/regression)
  Uses: @playwright/test (Node.js API)
  Purpose: Re-run parameterized specs headlessly for regression
  Outputs: testing/test-results/, testing/playwright-report/
  Auth state: testing/config/auth-state-pw.json

Shared config:
  testing/config/vv-config.json     VV credentials
  testing/config/tz-{tz}.json       Timezone overrides (CLI only)
  testing/playwright.config.js      Test runner config (3 TZ projects)
```

**Why two layers?** The command (Layer 1) is for _exploratory testing_ — Claude opens a browser, interacts with VV live, captures actual behavior, and generates documentation. The test runner (Layer 2) is for _regression testing_ — re-running the parameterized specs to detect if VV behavior changes.

---

## File Reference

| File                           | Purpose                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `../fixtures/vv-config.js`     | Shared constants: form template URL, field configuration map (A-H), saved record URLs |
| `../fixtures/test-data.js`     | All test case definitions as structured data (data-driven parameterization)           |
| `../helpers/vv-form.js`        | Generic VV form helpers: navigation, field verification, value capture                |
| `../helpers/vv-calendar.js`    | Calendar-specific helpers: popup date selection, typed input                          |
| `../global-setup.js`           | Runs once before all tests: logs into VV, saves auth cookies                          |
| `cat-1-calendar-popup.spec.js` | Category 1 — calendar popup date selection tests                                      |
| `cat-2-typed-input.spec.js`    | Category 2 — keyboard segment-by-segment date entry tests                             |
| `cat-3-server-reload.spec.js`  | Category 3 — save/reload value integrity tests (same-TZ and cross-TZ)                 |

### External Config

| File                       | Purpose                                                         |
| -------------------------- | --------------------------------------------------------------- |
| `../playwright.config.js`  | TZ × browser matrix (9 projects: 3 TZ × 3 browsers), auth state |
| `../config/vv-config.json` | VV credentials (gitignored)                                     |
| `../config/tz-*.json`      | Timezone overrides for `playwright-cli` (Layer 1 only)          |

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

All spec files run in all 9 projects (3 TZ × 3 browsers). Each test uses `test.skip()` inside the test body to self-filter — it only executes when `testInfo.project.name` starts with its `tz` field in `test-data.js` (e.g., a BRT test runs in `BRT-chromium`, `BRT-firefox`, and `BRT-webkit`).

**To add a new timezone or browser:**

- **Timezone:** Add an entry to the `timezones` array in `testing/playwright.config.js` — all browser combinations are generated automatically
- **Browser:** Add an entry to the `browsers` array in `testing/playwright.config.js`
- Add test entries to `testing/fixtures/test-data.js` with the new TZ
- For CLI workflow: add a TZ config file at `testing/config/tz-{tz}.json`

---

## Adding New Tests

### Path 1: Via the Command (Recommended)

The `/@-create-pw-date-test <category-id>` command:

1. Opens a browser with the target timezone
2. Runs the test live and captures actual behavior
3. Generates markdown TC spec, run file, and summary in `tasks/date-handling/`
4. Appends the test case definition to `testing/fixtures/test-data.js`

```
/@-create-pw-date-test 2-D-IST
```

### Path 2: Manual Creation

1. Add a test case entry to `testing/fixtures/test-data.js` with all required fields
2. If the category spec file doesn't exist yet (e.g., `cat-2-typed-input.spec.js`), create it following the pattern in `cat-1-calendar-popup.spec.js`
3. Run `npm run test:pw` to verify

---

## Debugging

### Form Didn't Load (timeout on `waitForVVForm`)

The VV Angular SPA requires `networkidle` before `waitForFunction` can detect `VV.Form`. If the form loads slowly:

- Check network connectivity to `vvdemo.visualvault.com`
- Try headed mode: `npm run test:pw:headed`
- Increase timeout in `gotoAndWaitForVVForm` (default: 60s)

### Wrong Timezone in Browser

If `new Date().toString()` doesn't match the expected offset:

- Verify `testing/playwright.config.js` has the correct `timezoneId` for the project
- Ensure the test data entry has the correct `tz` and `tzOffset` values

### Auth Expired / Login Redirect

If tests fail with a login page instead of the form:

- Delete `testing/config/auth-state-pw.json` and re-run
- Verify credentials in `testing/config/vv-config.json`
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
3. Waits for the target month's tbody to appear (explicit wait, no arbitrary timeout)
4. Finds the correct `tbody` by matching the "Month Year" header text
5. Clicks the day cell within that specific section

If it clicks the wrong month's day, the `tbody` header matching logic may need updating for a new calendar version.
