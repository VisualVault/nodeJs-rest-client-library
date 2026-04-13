# Web Service & Scheduled Service Naming — Valid Characters Investigation

## Date: 2026-04-13

## Question

Do VV platform web service and scheduled service names accept `_` (underscore) and `-` (hyphen)?

## Answer: Yes — both are valid for both service types

Both characters are accepted. Services with these characters:

- Are stored correctly in the database
- Appear in admin grids and API responses with exact names preserved
- Web services are callable via `runWebService(name, data)` — the server routes correctly

## Evidence

### Existing production services (from extracts)

| Name                                 | Type | Environment           | Character  |
| ------------------------------------ | ---- | --------------------- | ---------- |
| `OrbipayEventWebHook-Support-Ticket` | WS   | WADNR (vv5dev)        | hyphen     |
| `zzzmoi-test`                        | WS   | WADNR (vv5dev)        | hyphen     |
| `LibForm_CreateCommunicationLog`     | WS   | EmanuelJofre (vvdemo) | underscore |
| `LibWorkflow_CreateCommunicationLog` | WS   | EmanuelJofre (vvdemo) | underscore |

### Web services — empirical verification (vvdemo, 2026-04-13)

| Name                     | API visible | Callable | Notes                                  |
| ------------------------ | ----------- | -------- | -------------------------------------- |
| `zzzTestUnderscore_Name` | Yes         | Yes      | Created via `tools/admin/create-ws.js` |
| `zzzTest-Hyphen-Name3`   | Yes         | Yes      | Created via `tools/admin/create-ws.js` |
| `zzzTest_Mixed-Chars`    | Yes         | Yes      | Both characters in one name            |

All 3 web services:

- Appear in `getOutsideProcesses()` API response with exact names
- Respond to `runWebService()` invocation (server routes correctly)
- No character transformation or encoding occurs

### Scheduled services — empirical verification (vvdemo, 2026-04-13)

| Name                   | In Grid | Notes                       |
| ---------------------- | ------- | --------------------------- |
| `zzzSched_Underscore2` | Yes     | Linked to `zzzSchedTarget`  |
| `zzzSched-Hyphen2`     | Yes     | Linked to `zzzSchedTarget`  |
| `zzzSched_Mixed-2`     | Yes     | Both characters in one name |

All 3 scheduled services appear in the `scheduleradmin` grid with exact names (8 items total, verified on single page).

### Scheduled service execution test (vvdemo, 2026-04-13)

- Created `zzzSched_RunTest` linked to `zzzSchedTestScript` (proper scheduled script with `postCompletion()`)
- Enabled the schedule and clicked "Test Microservice" button
- **Full end-to-end execution confirmed** (local Node.js server on port 3000 via ngrok tunnel):
    1. VV cloud -> ngrok -> localhost:3000 -> `scheduledscripts` route received the call
    2. Server wrote script to temp file, loaded it, called `getCredentials()`
    3. `acquireSecurityToken Success` — authenticated with VV API
    4. `Calling the scheduledScript's Main method` — script executed
    5. `zzzSchedTestScript executed at Mon Apr 13 2026 10:44:06` — our code ran
    6. `POST /scheduledProcess/{guid}` — `postCompletion()` reported success back to VV
- Note: "Last Run Date" in grid doesn't update for manual test runs (only for automatic scheduled triggers) — this is VV platform behavior, not a naming issue
- **Conclusion:** Schedule names with `_` work end-to-end: creation, grid display, execution routing, and completion reporting.

### Failed creation attempts (connection type bug — tool issue, not platform)

`zzzTest-Hyphen-Name` and `zzzTest-Hyphen-Name2` (web services) were created but do NOT appear in the API. Root cause: the `create-ws.js` tool initially failed to trigger the ASP.NET postback when switching the connection type dropdown from "Web Service" to "Node.Js Server". The services were saved with connection type "Web Service" instead of "Node.Js Server", making them invisible to the standard `outsideprocesses` API query.

**Lesson:** The connection type dropdown requires a `__doPostBack` to take effect — `selectOption` alone is insufficient. Fixed in the tool using `vvAdmin.triggerPostback()`.

Similarly, initial scheduled service attempts failed silently because the "Recurring" checkbox was checked by default without an interval. Fixed by unchecking it.

## Characters NOT tested

The following characters were not tested but may be worth investigating:

- Spaces (` `)
- Dots (`.`)
- Special characters (`@`, `#`, `!`, etc.)
- Unicode / accented characters
- Leading/trailing special characters
