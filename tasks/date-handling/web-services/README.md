# Web Services — Date Handling Testing

REST API date handling investigation. Tests how dates are sent, stored, and returned through the VV API via web services.

## Files

| File                          | Purpose                                                       |
| ----------------------------- | ------------------------------------------------------------- |
| `matrix.md`                   | Test matrix — 9 categories, ~118 slots                        |
| `analysis.md`                 | Hypotheses, confirmed behaviors, confirmed bugs               |
| `results.md`                  | Live test evidence                                            |
| `webservice-test-harness.js`  | Server-side harness — all 9 categories via `Action` parameter |
| `webservice-pattern.js`       | Clean VV web service template (reference)                     |
| `ws-harness-button.js`        | Client-side form button script to call the harness            |
| `web-service-call-pattern.js` | Generic VV web service call pattern (reference)               |
| `test-cases/`                 | Individual TC spec files                                      |
| `runs/`                       | Immutable execution records                                   |
| `summaries/`                  | Per-TC status files                                           |

---

## Environment Setup

### Prerequisites

1. Node.js server running: `node lib/VVRestApi/VVRestApiNodeJs/app.js` (port 3000)
2. Server accessible from VV (use ngrok or similar for local dev if needed)

### One-Time VV Configuration

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

| Field Name    | Type                  | Purpose                                         |
| ------------- | --------------------- | ----------------------------------------------- |
| `WSAction`    | Text                  | Test action: `WS-1` through `WS-9`              |
| `WSConfigs`   | Text                  | Target configs: `A,C,D` or `ALL`                |
| `WSRecordID`  | Text                  | Instance name for read tests: `DateTest-000080` |
| `WSInputDate` | Text                  | Date to write: `2026-03-15`                     |
| `WSResult`    | Text (large/textarea) | Displays JSON response                          |

Optional: `WSInputFormats` (Text) for WS-5 format tolerance.

#### 3. Add Form Button

Add a button to the form and assign `ws-harness-button.js` as its script. The script:

- Reads `WSAction`, `WSConfigs`, `WSRecordID`, `WSInputDate` from the form
- Pushes them as extra fields into the form data collection
- Calls the `DateTestWSHarness` Microservice
- Displays the full JSON response in `WSResult`

---

## Test Execution

| Mode            | Tool                 | Use case                                        |
| --------------- | -------------------- | ----------------------------------------------- |
| **Exploration** | Claude-in-Chrome MCP | Fill matrix slots, initial discovery, debugging |
| **Regression**  | Playwright           | Automated repeat runs across configs/TZs        |

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

See `matrix.md` for full slot tables and `analysis.md` for hypotheses.
