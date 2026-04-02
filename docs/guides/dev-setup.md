# Dev Environment Setup

Step-by-step guide to set up the nodeV2 development and testing environment from scratch.

## Prerequisites

- **Node.js** >= 20
- **Chrome** browser (Chromium project uses installed Chrome via `channel: 'chrome'`; Firefox and WebKit use Playwright's bundled engines)
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

### 4.1 Install Playwright Browsers

```bash
npx playwright install chrome firefox webkit
```

### 4.2 Install playwright-cli (optional — for interactive test creation only)

```bash
npm install -g @playwright/cli@latest
```

This is only needed for the `/@-test-forms-date-pw` command (Layer 1). The headless test runner (Layer 2) uses `@playwright/test` which is already in devDependencies.

### 4.3 Create VV Credentials File

```bash
cp testing/config/vv-config.example.json testing/config/vv-config.json
```

Edit `testing/config/vv-config.json`:

| Field           | Description                             | Default                          |
| --------------- | --------------------------------------- | -------------------------------- |
| `instance`      | VV instance name                        | `vvdemo`                         |
| `loginUrl`      | VV login URL                            | `https://vvdemo.visualvault.com` |
| `username`      | Your VV email                           | —                                |
| `password`      | Your VV password                        | —                                |
| `customerAlias` | Customer alias for your tenant          | —                                |
| `databaseAlias` | Database alias                          | `Main`                           |
| `clientId`      | OAuth app client ID (for WS runner)     | —                                |
| `clientSecret`  | OAuth app client secret (for WS runner) | —                                |

`clientId` and `clientSecret` are required for the WS test runner (`run-ws-test.js`). Register an API application in VV Admin to obtain these. Playwright tests do not need them (they use browser auth).

This file is gitignored. Never commit credentials.

### 4.4 Authentication

`testing/global-setup.js` runs automatically before any test suite and handles two tasks:

**Authentication:**

1. If `testing/config/auth-state-pw.json` exists and is less than 1 hour old → skips login
2. Otherwise → launches Chrome, navigates to VV login, fills credentials, saves cookies

**Record creation** (for cross-TZ reload tests):

1. If `testing/config/saved-records.json` exists and is less than 1 hour old → skips
2. Otherwise → creates form records via browser UI per `RECORD_DEFINITIONS` in `vv-config.js`, using the specified input method (popup, typed, SetFieldValue) and timezone per record. Extracts DataIDs via `VV.Form.DataID` and writes to `saved-records.json`

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

### 4.5 Project Matrix (TZ × Browser)

Tests run across a matrix of 3 timezones × 3 browsers = 9 Playwright projects. Playwright's `timezoneId` context option simulates timezones at the browser level — no system timezone changes needed.

**Timezones:**

| TZ   | IANA Name           | Offset   |
| ---- | ------------------- | -------- |
| BRT  | `America/Sao_Paulo` | UTC-3    |
| IST  | `Asia/Calcutta`     | UTC+5:30 |
| UTC0 | `Etc/GMT`           | UTC+0    |

**Browsers:**

| Browser  | Engine                                      |
| -------- | ------------------------------------------- |
| chromium | System Chrome (`channel: 'chrome'`)         |
| firefox  | Playwright's bundled Firefox                |
| webkit   | Playwright's bundled WebKit (Safari engine) |

Project names follow the pattern `{TZ}-{browser}` (e.g., `BRT-chromium`, `IST-firefox`, `UTC0-webkit`).

Config details: `testing/playwright.config.js` (serial execution, `workers: 1`, 60s timeout).

### 4.6 Run Tests

```bash
npm run test:pw              # All projects (3 TZ × 3 browsers)
npm run test:pw:brt          # BRT — all browsers
npm run test:pw:ist          # IST — all browsers
npm run test:pw:utc0         # UTC+0 — all browsers
npm run test:pw:chromium     # Chromium — all TZs
npm run test:pw:firefox      # Firefox — all TZs
npm run test:pw:webkit       # WebKit (Safari) — all TZs
npm run test:pw:headed       # Headed mode (visible browser)
npm run test:pw:report       # Open HTML report
```

You can also target a single cell: `npx playwright test --config=testing/playwright.config.js --project=BRT-firefox`

### 4.7 Two Automation Layers

| Aspect     | Layer 1 (interactive)                      | Layer 2 (regression)                                          |
| ---------- | ------------------------------------------ | ------------------------------------------------------------- |
| Tool       | `playwright-cli`                           | `@playwright/test` via `npx playwright test`                  |
| Trigger    | `/@-test-forms-date-pw <id>`               | `npm run test:pw`                                             |
| Purpose    | Live verification + artifact generation    | Headless regression testing                                   |
| Auth state | `testing/config/auth-state.json`           | `testing/config/auth-state-pw.json`                           |
| Outputs    | TC specs, run files, summaries in `tasks/` | `testing/tmp/test-results/`, `testing/tmp/playwright-report/` |

## 5. Web Services Testing Setup

WS testing uses a direct Node.js runner to call the VV API. No server or browser needed for API-only tests.

### 5.0 Server-Side Credentials (`.env.json`)

When running tests through VV's Microservice routing (browser path), the server needs credentials to authenticate API calls. Create `.env.json` in the repo root (gitignored):

```json
{
    "activeEnv": "vvdemo",
    "environments": {
        "vvdemo": {
            "baseUrl": "https://vvdemo.visualvault.com",
            "customerAlias": "YourCustomer",
            "databaseAlias": "Main",
            "clientId": "YOUR_CLIENT_ID",
            "clientSecret": "YOUR_CLIENT_SECRET",
            "userId": "YOUR_CLIENT_ID",
            "password": "YOUR_CLIENT_SECRET",
            "audience": ""
        }
    }
}
```

`app.js` loads the active environment into `global.VV_ENV` at startup. Server-side scripts read from this global via `getCredentials()`. Switch environments by changing `activeEnv` and restarting the server.

The direct runner (`run-ws-test.js`) uses `testing/config/vv-config.json` instead — it doesn't go through the server.

### 5.1 Prerequisites

- VV credentials in `testing/config/vv-config.json` with `clientId` and `clientSecret` fields (see section 4.3)
- To obtain OAuth credentials: register an API application in VV Admin (Admin Tools > API Applications, or contact your VV admin)

### 5.2 Quick Start (Direct Runner)

```bash
# Smoke test — read an existing record
node tasks/date-handling/web-services/run-ws-test.js --action WS-2 --configs A,D --record-id DateTest-000080

# Create a record via API
node tasks/date-handling/web-services/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15

# Debug mode (includes raw API response)
node tasks/date-handling/web-services/run-ws-test.js --action WS-2 --configs ALL --record-id DateTest-000080 --debug

# Simulate cloud/AWS timezone
TZ=UTC node tasks/date-handling/web-services/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15

# Attach debugger (VS Code)
node --inspect-brk tasks/date-handling/web-services/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15
```

The runner authenticates with VV, builds the ffCollection, calls the harness, and prints the JSON result. No local server needed.

### 5.3 Browser Path Setup (Optional — for WS-4 or production-path validation)

This path calls the harness through VV's Microservice routing, like a real production form button would. Only needed for WS-4 (API→Forms cross-layer) or to validate the full production path.

**One-time VV configuration:**

1. **Start the local server**: `node lib/VVRestApi/VVRestApiNodeJs/app.js` (port 3000)
2. **Make server accessible from VV**: Use ngrok or similar tunneling tool (`ngrok http 3000`). Note the public URL.
3. **Register the Microservice** in VV: Enterprise Tools > Microservices (`/outsideprocessadmin`). Set Service Name = `DateTestWSHarness`, URL = `{public URL}/scripts`, Category = `Form`, Service Type = `NodeServer`.
4. **Add form fields**: On the DateTest form template, add text fields: `WSAction`, `WSConfigs`, `WSRecordID`, `WSInputDate`, `WSResult` (textarea).
5. **Add form button**: Assign `ws-harness-button.js` as the button script (copy the code into the VV form button editor).

Full details: [`tasks/date-handling/web-services/README.md`](../../tasks/date-handling/web-services/README.md)

## 6. Upstream Sync

```bash
git fetch upstream
git merge upstream/master
```

Origin: `emanueljofre/nodeV2` | Upstream: `VisualVault/nodeJs-rest-client-library`

## 7. Troubleshooting

### Form didn't load (timeout on `waitForVVForm`)

VV's Angular SPA requires `networkidle` before `waitForFunction` can detect `VV.Form`. Try:

- Check network connectivity to your VV instance
- Run headed mode: `npm run test:pw:headed`
- Increase timeout in `gotoAndWaitForVVForm` (default: 60s)

### Wrong timezone in browser

If `new Date().toString()` doesn't match the expected offset:

- **Layer 2** (`npx playwright test`): Verify `testing/playwright.config.js` has the correct `timezoneId` for the project
- **Layer 1** (`playwright-cli`): Verify TZ config files (`testing/config/tz-*.json`) use the nested format: `{ "browser": { "contextOptions": { "timezoneId": "..." } } }`. The flat `{ "timezoneId": "..." }` format is silently ignored by `playwright-cli`.
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
