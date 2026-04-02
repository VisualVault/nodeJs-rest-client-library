# VisualVault Platform Architecture

Reference for navigating, understanding, and scripting against the VisualVault platform. Based on direct exploration of `vvdemo.visualvault.com` (EmanuelJofre/Main database).

---

## URL Anatomy

### Main Application

```
https://{environment}.visualvault.com/app/{customer}/{database}/{section}
```

| Segment       | Description                   | Examples                                               |
| ------------- | ----------------------------- | ------------------------------------------------------ |
| `environment` | Server instance               | `vvdemo`, `vv5dev`                                     |
| `customer`    | VV customer / org             | `EmanuelJofre`, `WADNR`, `CityOfLincoln`               |
| `database`    | Workspace within the customer | `Main`, `Phase2`, `fpOnline`, `BusinessRegistration`   |
| `section`     | Page or module                | `FormTemplateAdmin`, `formdata`, `outsideprocessadmin` |

**Examples:**

```
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/
https://vv5dev.visualvault.com/app/WADNR/fpOnline/FormTemplateAdmin
https://vv5dev.visualvault.com/app/CityOfLincoln/Phase2/formdata
```

### Form Viewer (separate app — fills in a form record)

```
https://{env}.visualvault.com/FormViewer/app?hidemenu=true&formid={templateGUID}&xcid={customerGUID}&xcdid={databaseGUID}
```

- `formid` — GUID of the Form Template
- `xcid` — GUID identifying the customer
- `xcdid` — GUID identifying the database
- `hidemenu=true` — hides the VV navigation shell (typical for end-user forms)

Opening a template URL creates a **new blank form instance** each time (named sequentially, e.g., `DateTest-000012`).

To reopen a **saved record**, use the `DataID` parameter instead of `formid`:

```
https://{env}.visualvault.com/FormViewer/app?DataID={recordGUID}&hidemenu=true&rOpener=1&xcid={customerGUID}&xcdid={databaseGUID}
```

- `DataID` — GUID of the specific form record (replaces `formid`)
- `rOpener=1` — indicates the form was opened from a record list

The FormViewer is a completely separate SPA from the main VV shell. It runs independently with its own URL structure.

---

## Navigation Map

All sections are accessed from the top nav bar within `https://{env}.visualvault.com/app/{customer}/{database}/`:

| Nav Label                 | URL Path                                | Description                                                                                                                                               |
| ------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Library**      | `/DocumentLibrary`                      | Folder-tree document storage. Left panel = folder tree, right = file list. Has a Recycle Bin.                                                             |
| **Form Templates**        | `/FormTemplateAdmin`                    | Admin view to create/manage form schemas. Columns: Category, Template Name, Form Design (View/Edit), Description, Status, Revision, Import, Export, Copy. |
| **Form Library**          | `/FormDataAdmin`                        | End-user list of all forms available to fill in. Each row has a "Fill-In" link that opens the FormViewer.                                                 |
| **Dashboards**            | `/formdata`                             | List of dashboards — one per form template — showing submitted records. Each dashboard is viewable and editable.                                          |
| **Reports**               | Submenu                                 | Report generation. Submenu items vary by customer setup.                                                                                                  |
| **Process Design Studio** | `/ProcessDesignStudio?access_token=...` | Visual workflow (BPMN-style) designer. Token-authenticated. Separate app.                                                                                 |
| **Admin Tools**           | Dropdown                                | Users, Groups, Portals, Menus, Dropdown Lists, Site Administration (Locations, Customers, Suppliers)                                                      |
| **Enterprise Tools**      | Via Control Panel                       | Microservices, Scheduled Services, Data Connections, Data Connection Queries — see below                                                                  |

---

## Enterprise Tools

Located under **Control Panel > Enterprise Tools** (breadcrumb). These are the integration and automation sections — most relevant to scripting work.

### Microservices

**URL:** `/outsideprocessadmin`
**UI Label:** "Microservices" (formerly called "Web Services" in older VV docs)
**Breadcrumb:** Control Panel > Enterprise Tools > Microservice Library

Where external service endpoints are registered. The Node.js server (`nodeV2`) appears here.

| Column              | Notes                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Service Name        | Identifier used by forms and scheduled services                       |
| Service Description | Human-readable description                                            |
| Category            | `Form` = triggered by form button/event; `Scheduled` = cron-triggered |
| Service Type        | `NodeServer` for the Node.js microservices server                     |
| Timeout             | Request timeout (0 = default)                                         |
| Callback            | Boolean — whether VV waits for a response                             |

**How it connects to nodeV2:** When a form event fires or a scheduled process runs, VV calls the registered URL in this library. The `nodeV2` server receives the POST, executes the script code, and returns results.

### Scheduled Services

**URL:** `/scheduleradmin`
**UI Label:** "Scheduled Services"
**Breadcrumb:** Control Panel > Enterprise Tools > Scheduled Services

Cron-like configuration for automated scripts. Each schedule references a Microservice by name.

| Column        | Notes                                                               |
| ------------- | ------------------------------------------------------------------- |
| Name          | Schedule name                                                       |
| Enable        | On/Off toggle                                                       |
| Run State     | `Idle` when not running                                             |
| Set to Idle   | Reset button (force-stops if stuck)                                 |
| Last Run Date | Timestamp of last execution                                         |
| Recurrence    | e.g., "Every 2 Minutes", "Every 365 Days", "Recurrence Not Enabled" |
| Next Run Date | Calculated next execution                                           |
| Service Name  | References a Microservice from `/outsideprocessadmin`               |

### Data Connections

**URL:** `/ConnectionsAdmin`
**UI Label:** "Database Connections"
**Breadcrumb:** Control Panel > Enterprise Tools > Data Connections

SQL Server connections backing the VV databases. Two connections exist per customer+database workspace:

| Connection                               | Type       | Description                    |
| ---------------------------------------- | ---------- | ------------------------------ |
| `use1d-demosql_vv5demo_EmanuelJofre_...` | SQL Server | VisualVault main database      |
| `use1d-demosql_vv5demo_EmanuelJofre_...` | SQL Server | VisualVault form data database |

Note: `ConnectionQueryAdmin` URL redirects here first. Click "Queries" on a connection to see its queries.

### Data Connection Queries

**URL:** `/ConnectionQueryAdmin?CcID={connectionGUID}`
**UI Label:** "Database Query Manager"
**Breadcrumb:** Control Panel > Enterprise Tools > Data Connections > Data Connection Queries

Named SQL queries defined on top of a connection. Used in dashboards, reports, and scripts via `vvClient.customQuery`.

| Column        | Notes                        |
| ------------- | ---------------------------- |
| Query Name    | Identifier used in API calls |
| Edit          | Opens query editor           |
| Description   | Human-readable               |
| Type          | `Text Query` (raw SQL)       |
| Cache Enabled | Enabled by default           |
| Cache Expires | Default 1.0 hrs              |

**Special `CcID`:** The form database uses `CcID=00000001-0000-0000-0000-c0000000f002` — this is the default form data connection. One query is typically created per form template.

**Query name validation:** Alphanumeric characters, hyphens, underscores, spaces, and commas are allowed. **Periods are not allowed** — use hyphens instead (e.g., `TC-2-4` not `TC-2.4`).

**Preview feature:** After entering SQL in the editor, click **Preview** to run the query and see results immediately without saving. Useful for ad-hoc DB inspection during testing.

**API usage:** `vvClient.customQuery.getCustomQueryResultsByName({ queryName: 'MyQuery', ... })`

### Form Database Schema

Form field values are stored in SQL tables named after the form template. Each form template maps to one table.

| Column                        | Description                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `DhDocID`                     | Form instance identifier — e.g., `DateTest-000004`. Used in `WHERE` clauses to target a specific record. |
| `DataField1`, `DataField2`, … | One column per VV field, named after the VV field name                                                   |
| Other `Dh*` columns           | System columns (status, revision, timestamps, etc.)                                                      |

Example query to inspect a saved record:

```sql
SELECT DhDocID, DataField1, DataField2, DataField5, DataField6, DataField7
FROM DateTest
WHERE DhDocID = 'DateTest-000004'
```

**Date storage format in the DB:** Values appear as `M/d/yyyy h:mm:ss tt` (e.g., `3/15/2026 12:00:00 AM`). There is no timezone suffix — the database does not record whether a value is UTC or local time. See [Calendar field mixed timezone storage](#calendar-field-mixed-timezone-storage) in `docs/reference/form-fields.md` for the implications.

---

## Admin Tools

Accessible from the top nav dropdown:

| Item                           | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| Users                          | User management — create, edit, assign groups            |
| Groups                         | Security groups — control access to forms, documents     |
| Portals                        | Customer-facing portal configuration                     |
| Menus                          | Custom navigation menus for portals                      |
| Dropdown Lists                 | Shared dropdown/lookup lists reusable across form fields |
| Site Administration: Locations | Physical location definitions                            |
| Site Administration: Customers | Customer entity management                               |
| Site Administration: Suppliers | Supplier entity management                               |

---

## How nodeV2 Fits In

```
VV Platform
    │
    ├── Form event fires (button click)
    │       │
    │       └─→ POST /scripts  ──→  nodeV2 Express server (port 3000)
    │                                    │
    │                                    ├── Creates temp module from script code
    │                                    ├── Injects vvClient (authenticated)
    │                                    └── Returns result to VV
    │
    └── Scheduled Service triggers
            │
            └─→ POST /scheduledscripts  ──→  nodeV2 Express server
```

The Microservice registered in VV points to `{nodeV2 server URL}/scripts` or `/scheduledscripts`. VV calls this URL with the script code as payload. The server executes it and responds.

**Registration:** Each script is registered in **Microservices** (`/outsideprocessadmin`) as `Service Type: NodeServer`. Form scripts use `Category: Form`; cron scripts use `Category: Scheduled` and appear in **Scheduled Services** too.

---

## Key Concepts & GUIDs

- **`formid`** — identifies a Form Template. Stable across versions.
- **`xcid`** — identifies the customer in the VV database.
- **`xcdid`** — identifies the specific database within the customer.
- **`CcID`** — Connection ID for a Data Connection; used in query URLs.
- **Revision** — form templates are versioned. Scripts reference a specific revision or "Released" status.
- **Status:** `Released` = live/published; `Release` = draft/in-progress (UI inconsistency — "Release" means it hasn't been released yet).

---

## Demo Environment Reference

| Item                        | Value                                                   |
| --------------------------- | ------------------------------------------------------- |
| Environment                 | `vvdemo`                                                |
| Customer                    | `EmanuelJofre`                                          |
| Database                    | `Main`                                                  |
| Base URL                    | `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/` |
| Customer GUID (`xcid`)      | `815eb44d-5ec8-eb11-8200-a8333ebd7939`                  |
| Database GUID (`xcdid`)     | `845eb44d-5ec8-eb11-8200-a8333ebd7939`                  |
| Form DB connection CcID     | `00000001-0000-0000-0000-c0000000f002`                  |
| Form templates              | 122 (as of 2026-03)                                     |
| Microservices registered    | 42                                                      |
| Scheduled services          | 5                                                       |
| Dashboards                  | 25                                                      |
| Custom queries              | 124                                                     |
| FormViewer build (observed) | `20260304.1` — visible in top-right of FormViewer pages |

### Test Forms (demo environment)

| Form                          | Template GUID                          | Template URL                                                                                                                                                                                             | Notes                                                                     |
| ----------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DateTest                      | `6be0265c-152a-f111-ba23-0afff212cc87` | `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939`           | 8 date fields across all calendar configs; creates new instance each load |
| DateTest-000004 Rev 1 (saved) | —                                      | `https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939` | Saved record from BRT session; use for reload/cross-TZ tests              |

---

## Useful Direct URLs (demo environment)

```
# Main portal
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/

# Form Templates (admin)
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormTemplateAdmin

# Form Library (fill-in list)
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataAdmin

# Dashboards
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/formdata

# Microservices
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/outsideprocessadmin

# Scheduled Services
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/scheduleradmin

# Data Connections
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/ConnectionsAdmin

# Data Connection Queries (form DB)
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/ConnectionQueryAdmin?CcID=00000001-0000-0000-0000-c0000000f002

# Document Library
https://vvdemo.visualvault.com/app/EmanuelJofre/Main/DocumentLibrary
```

---

## API Behavior Notes

### Field Name Casing

The VV REST API returns field names **lowercased** in response objects (e.g., `datafield7` instead of `DataField7`). When writing data, the API accepts the original mixed casing. Scripts must account for this asymmetry when reading field values from API responses vs. constructing field data for writes.

### Data Passthrough

The Node.js client library (`lib/`) performs **no data transformation** between script code and the VV server. Field values (including dates) are serialized via `JSON.stringify()` on the way out and `JSON.parse()` on the way back. Dates remain as strings throughout — never converted to/from JavaScript `Date` objects by the library. See [Scripting Guide](../guides/scripting.md) for the full data flow.

---

## External Documentation

- Official docs: https://docs.visualvault.com/docs
