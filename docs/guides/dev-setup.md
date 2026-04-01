# Dev Environment Setup

Step-by-step guide to set up the nodeV2 development and testing environment from scratch.

## Prerequisites

- **Node.js** >= 20
- **Chrome** browser (VV's Angular SPA + Kendo UI require real Chrome, not Chromium)
- **Git**

## 1. Clone & Install

```bash
git clone git@github.com:emanueljofre/nodeV2.git
cd nodeV2
npm install
```

`npm install` also runs `husky` via the `prepare` script, which sets up the pre-commit hook.

## 2. Code Quality Tools

These are installed automatically with `npm install` and enforced on every commit via Husky + lint-staged:

| Tool            | Config File         | What It Does                                    |
| --------------- | ------------------- | ----------------------------------------------- |
| **ESLint**      | `eslint.config.js`  | Flat config, CommonJS, integrated with Prettier |
| **Prettier**    | `.prettierrc`       | Single quotes, 4-space indent, 120 print width  |
| **Husky**       | `.husky/pre-commit` | Runs `lint-staged` before each commit           |
| **lint-staged** | `package.json`      | ESLint fix + Prettier on staged `.js` files     |

Manual commands:

```bash
npm run lint              # Check lib/ and scripts/ for issues
npm run lint:fix          # Auto-fix lint issues
npm run format            # Format all JS files
npm run format:check      # Check formatting without writing
```

> **Note:** `lint` and `format` scripts scope to `lib/` and `scripts/` only. Files in `testing/` are covered by lint-staged on commit, or run `npx eslint testing/` directly.

## 3. Start the Server

```bash
node lib/VVRestApi/VVRestApiNodeJs/app.js
```

Test a scheduled script locally:

```bash
curl http://localhost:3000/TestScripts/Scheduled/ScriptName
```

## 4. Playwright Testing Setup

### 4.1 Install Playwright Browser

```bash
npx playwright install chromium
```

### 4.2 Install playwright-cli (optional — for interactive test creation only)

```bash
npm install -g @playwright/cli@latest
```

This is only needed for the `/@-create-pw-date-test` command (Layer 1). The headless test runner (Layer 2) uses `@playwright/test` which is already in devDependencies.

### 4.3 Create VV Credentials File

```bash
cp testing/config/vv-config.example.json testing/config/vv-config.json
```

Edit `testing/config/vv-config.json`:

| Field           | Description                    | Default                          |
| --------------- | ------------------------------ | -------------------------------- |
| `instance`      | VV instance name               | `vvdemo`                         |
| `loginUrl`      | VV login URL                   | `https://vvdemo.visualvault.com` |
| `username`      | Your VV email                  | —                                |
| `password`      | Your VV password               | —                                |
| `customerAlias` | Customer alias for your tenant | —                                |
| `databaseAlias` | Database alias                 | `Main`                           |

This file is gitignored. Never commit credentials.

### 4.4 Authentication

`testing/global-setup.js` runs automatically before any test suite:

1. If `testing/config/auth-state-pw.json` exists and is less than 1 hour old → skips login
2. Otherwise → launches Chrome, navigates to VV login, fills credentials, saves cookies

Two separate auth state files exist because `playwright-cli` and `@playwright/test` manage browser contexts independently:

| File                                | Used By                                    | Created By                  |
| ----------------------------------- | ------------------------------------------ | --------------------------- |
| `testing/config/auth-state.json`    | `playwright-cli` (Layer 1 — CLI command)   | `playwright-cli state-save` |
| `testing/config/auth-state-pw.json` | `@playwright/test` (Layer 2 — test runner) | `global-setup.js`           |

Both are gitignored.

**Force re-login:**

```bash
rm testing/config/auth-state-pw.json
npm run test:pw:brt
```

### 4.5 Timezone Projects

Tests run across 3 timezone contexts configured as Playwright projects. Playwright's `timezoneId` context option simulates these at the browser level — no system timezone changes needed.

| Project | IANA Name           | Offset   |
| ------- | ------------------- | -------- |
| BRT     | `America/Sao_Paulo` | UTC-3    |
| IST     | `Asia/Calcutta`     | UTC+5:30 |
| UTC0    | `Etc/GMT`           | UTC+0    |

Config details: `testing/playwright.config.js` (serial execution, `workers: 1`, `channel: 'chrome'`, 60s timeout).

### 4.6 Run Tests

```bash
npm run test:pw              # All TZ projects (BRT, IST, UTC0)
npm run test:pw:brt          # BRT tests only
npm run test:pw:ist          # IST tests only
npm run test:pw:utc0         # UTC+0 tests only
npm run test:pw:headed       # Headed mode (visible browser)
npm run test:pw:report       # Open HTML report
```

### 4.7 Two Automation Layers

| Aspect     | Layer 1 (interactive)                      | Layer 2 (regression)                                  |
| ---------- | ------------------------------------------ | ----------------------------------------------------- |
| Tool       | `playwright-cli`                           | `@playwright/test` via `npx playwright test`          |
| Trigger    | `/@-create-pw-date-test <id>`              | `npm run test:pw`                                     |
| Purpose    | Live verification + artifact generation    | Headless regression testing                           |
| Auth state | `testing/config/auth-state.json`           | `testing/config/auth-state-pw.json`                   |
| Outputs    | TC specs, run files, summaries in `tasks/` | `testing/test-results/`, `testing/playwright-report/` |

## 5. Upstream Sync

```bash
git fetch upstream
git merge upstream/master
```

Origin: `emanueljofre/nodeV2` | Upstream: `VisualVault/nodeJs-rest-client-library`

## 6. Troubleshooting

### Form didn't load (timeout on `waitForVVForm`)

VV's Angular SPA requires `networkidle` before `waitForFunction` can detect `VV.Form`. Try:

- Check network connectivity to your VV instance
- Run headed mode: `npm run test:pw:headed`
- Increase timeout in `gotoAndWaitForVVForm` (default: 60s)

### Wrong timezone in browser

If `new Date().toString()` doesn't match the expected offset:

- Verify `testing/playwright.config.js` has the correct `timezoneId` for the project
- Ensure test data entry has correct `tz` and `tzOffset` values

### Auth expired / login redirect

Tests fail showing a login page instead of the form:

- Delete `testing/config/auth-state-pw.json` and re-run
- Verify credentials in `testing/config/vv-config.json`
- Check if the VV instance is accessible

### `playwright-cli` not found

```bash
npm install -g @playwright/cli@latest
```

### "No field matches config"

`verifyField()` throws this when:

- The VV form template doesn't have a field with the expected config flags
- The form hasn't fully loaded (check that `waitForVVForm` completed)
- The field configuration on the VV form was changed

## Verification Checklist

After completing setup, verify everything works:

```bash
# Code quality tools
npm run lint && npm run format:check

# Jest tests
npm test

# Playwright tests (BRT is fastest — fewest entries)
npm run test:pw:brt
```

All three should pass with no errors.
