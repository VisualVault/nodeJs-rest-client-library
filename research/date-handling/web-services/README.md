# Web Services — Date Handling Testing

REST API date handling investigation. Tests how dates are sent, stored, and returned through the VV API via web services.

## Files

| File                                            | Purpose                                                        |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `matrix.md`                                     | Test matrix methodology — 10 categories, 148 slots             |
| `analysis/`                                     | Analysis & conclusions (overview + per-bug documents)          |
| `scripts/examples/webservice-test-harness.js`   | Server-side harness — all 10 categories via `Action` parameter |
| `scripts/templates/webservice-pattern.js`       | Clean VV web service template (reference)                      |
| `scripts/examples/form/ws-harness-button.js`    | Client-side form button script to call the harness             |
| `scripts/templates/web-service-call-pattern.js` | Generic VV web service call pattern (reference)                |
| `tools/runners/run-ws-test.js`                  | Direct Node.js CLI runner (auth + harness invocation)          |
| `test-cases/`                                   | Individual TC spec files                                       |

Execution output (runs, summaries, status, results) lives in `projects/{customer}/testing/date-handling/web-services/`.

---

## Environment Setup

> Full dev environment setup (Node.js, dependencies, credentials): [dev-setup.md](../../docs/guides/dev-setup.md)

### Prerequisites (Direct Runner — API-only tests)

1. `npm install` completed (dependencies installed)
2. `.env.json` with `clientId`, `clientSecret`, `username`, and `loginPassword` filled in (see [dev-setup.md section 4.3](../../docs/guides/dev-setup.md#43-create-credentials-file))
3. That's it — no server, no VV Microservice registration, no form button needed

**Quick smoke test:**

```bash
node tools/runners/run-ws-test.js --action WS-2 --configs A --record-id <record-id>
```

If this prints a JSON response with `"status": "Success"`, the runner is working.

Use `--template-name` when the form name differs from the default (e.g., `--template-name "zzzDate Test Harness"` for WADNR). See `projects/{customer}/test-assets.md` for form names and record IDs per environment.

### Prerequisites (Browser Path — form button tests)

Only needed for WS-4 (API→Forms cross-layer) or to validate the full production path.

1. `.env.json` in repo root with credentials for the active environment (see [dev-setup.md section 5.0](../../docs/guides/dev-setup.md#50-server-side-credentials-envjson))
2. Node.js server running: `node lib/VVRestApi/VVRestApiNodeJs/app.js` (port 3000)
3. Server accessible from VV: `ngrok http 3000` (or deploy to a public URL)
4. One-time VV configuration (see below)

### One-Time VV Configuration (Browser Path Only)

#### 1. Register the Microservice

Navigate to **Enterprise Tools > Microservices** (`/outsideprocessadmin`):

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Service Name | `DateTestWSHarness`                                                         |
| Category     | `Form`                                                                      |
| Service Type | `NodeServer`                                                                |
| URL          | `{nodeV2 server URL}/scripts` (e.g., `https://your-ngrok.ngrok.io/scripts`) |
| Timeout      | `60` (seconds — some tests create + read multiple records)                  |
| Callback     | `true`                                                                      |

#### 2. Add Form Fields for Test Control

On the DateTest form template (or a new dedicated WS test form), add 5 text fields:

| Field Name    | Type                  | Purpose                                                |
| ------------- | --------------------- | ------------------------------------------------------ |
| `WSAction`    | Text                  | Test action: `WS-1` through `WS-9`                     |
| `WSConfigs`   | Text                  | Target configs: `A,C,D` or `ALL`                       |
| `WSRecordID`  | Text                  | Instance name for read tests (e.g., `DateTest-000080`) |
| `WSInputDate` | Text                  | Date to write: `2026-03-15`                            |
| `WSResult`    | Text (large/textarea) | Displays JSON response                                 |

Optional: `WSInputFormats` (Text) for WS-5 format tolerance.

#### 3. Add Form Button

Add a button to the form and assign `ws-harness-button.js` as its script. The script:

- Reads `WSAction`, `WSConfigs`, `WSRecordID`, `WSInputDate` from the form
- Pushes them as extra fields into the form data collection
- Calls the `DateTestWSHarness` Microservice
- Displays the full JSON response in `WSResult`

---

## Test Execution

| Mode              | Tool                 | Use case                                                         |
| ----------------- | -------------------- | ---------------------------------------------------------------- |
| **Direct runner** | `run-ws-test.js`     | API-only tests (WS-1-3, WS-5-9). Debugger support. Primary path. |
| **Exploration**   | Claude-in-Chrome MCP | WS-4 (browser required), ad-hoc inspection                       |
| **Regression**    | Playwright           | Automated repeat runs across configs/TZs                         |

### Direct runner (primary for API tests)

Calls the harness directly in Node.js — no server, no VV Microservice, no browser. Full debugger support.

```bash
# Basic usage
node tools/runners/run-ws-test.js --action WS-1 --configs A,D --input-date 2026-03-15

# Read existing record
node tools/runners/run-ws-test.js --action WS-2 --configs ALL --record-id <record-id>

# With debug (includes raw API response in output)
node tools/runners/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15 --debug

# With VS Code debugger
node --inspect-brk tools/runners/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15

# Simulate cloud TZ
TZ=UTC node tools/runners/run-ws-test.js --action WS-1 --configs A --input-date 2026-03-15
```

**Credentials**: Reads from the root `.env.json` via `testing/fixtures/env-config.js`. See `.env.example.json` for the schema.

### Exploration flow (MCP)

1. Open DateTest form in Chrome
2. Set `WSAction`, `WSConfigs`, etc. via DevTools or form fields
3. Click the button
4. Read `WSResult` for the JSON response
5. Record findings in `results.md`

### Regression flow (Playwright)

1. Playwright opens form, sets parameters via `VV.Form.SetFieldValue()`
2. Clicks button, waits for response
3. Reads `WSResult` via `VV.Form.GetFieldValue()`
4. Asserts expected vs actual per matrix slot

### Server TZ simulation (WS-9)

Restart the Node.js server with `TZ=` env var to simulate different deployment environments:

```bash
TZ=UTC node lib/VVRestApi/VVRestApiNodeJs/app.js              # Cloud/AWS
TZ=Asia/Calcutta node lib/VVRestApi/VVRestApiNodeJs/app.js     # IST
TZ=America/Sao_Paulo node lib/VVRestApi/VVRestApiNodeJs/app.js # BRT (default)
```

This only affects the Node.js process — no need to change macOS system TZ or restart Chrome.

---

## Execution Order

| Step | Category | Rationale                                           |
| :--: | -------- | --------------------------------------------------- |
|  1   | WS-2     | Read existing records — no setup needed             |
|  2   | WS-1     | Create records — produces data for WS-3, WS-4, WS-8 |
|  3   | WS-3     | Round-trip — uses WS-1 records                      |
|  4   | WS-5     | Format tolerance — independent                      |
|  5   | WS-7     | Update path — independent                           |
|  6   | WS-4     | API→Forms — needs browser                           |
|  7   | WS-6     | Empty/null — edge cases                             |
|  8   | WS-8     | Query filtering — uses WS-1 records                 |
|  9   | WS-9     | Date computation — requires TZ= env var switching   |

See `matrix.md` for full slot tables and `analysis/overview.md` for hypotheses and conclusions.
