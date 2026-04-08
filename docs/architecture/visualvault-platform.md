# VisualVault Platform Architecture

Reference for navigating, understanding, and scripting against the VisualVault platform. Based on direct exploration of `vvdemo.visualvault.com` (EmanuelJofre/Main database).

---

## Multi-Tenant Hierarchy

VV uses a three-level tenancy model. Each level is a distinct scope for data, configuration, and access control:

```
Server (environment)          e.g., vvdemo.visualvault.com, vv5dev.visualvault.com
  └─ Customer (tenant/org)    e.g., EmanuelJofre, WADNR, CityOfLincoln
       └─ Database (workspace) e.g., Main, fpOnline, Phase2
```

- **Server**: the VV instance. Multiple customers can exist on the same server
- **Customer** (`customerAlias`): the organization/tenant. Has its own users, groups, API applications, and OAuth credentials
- **Database** (`databaseAlias`): a workspace within a customer. Has its own forms, documents, folders, scripts, and scheduled processes. A customer can have multiple databases (e.g., `Main` for production, `Phase2` for a separate project)

This hierarchy is reflected in URL paths, API authentication (`customerAlias`/`databaseAlias` parameters), and the `.env.json` structure (`servers → customers`).

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

### Form Details (opens a saved record within the VV app shell)

```
https://{env}.visualvault.com/app/{customer}/{database}/FormDetails?DataID={recordGUID}&Mode=ReadOnly&hidemenu=true
```

This is the route used by dashboards and the VV app to open form records. Unlike `FormViewer/app`, this loads VV.Form on the main page (no iframe, no standalone SPA). The dashboard's record-click link generates this URL via `VV.OpenWindow()` in a popup window.

### Dashboard Detail (shows a grid of form records)

```
https://{env}.visualvault.com/app/{customer}/{database}/FormDataDetails?Mode=ReadOnly&ReportID={dashboardGUID}
```

- `ReportID` — GUID identifying the dashboard/report to display
- `Mode=ReadOnly` — standard view mode (click a record to open it in FormViewer)

This is an ASP.NET page (not the Angular FormViewer SPA) using Telerik RadGrid for server-side rendering.

---

## Navigation Map

All sections are accessed from the top nav bar within `https://{env}.visualvault.com/app/{customer}/{database}/`:

| Nav Label                 | URL Path                                | Description                                                                                                                                                         |
| ------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Library**      | `/DocumentLibrary`                      | Folder-tree document storage. Left panel = folder tree, right = file list. Has a Recycle Bin.                                                                       |
| **Form Templates**        | `/FormTemplateAdmin`                    | Admin view to create/manage form schemas. Columns: Category, Template Name, Form Design (View/Edit), Description, Status, Revision, Import, Export, Copy.           |
| **Form Library**          | `/FormDataAdmin`                        | End-user list of all forms available to fill in. Each row has a "Fill-In" link that opens the FormViewer.                                                           |
| **Dashboards**            | `/formdata`                             | List of dashboards — one per form template — showing submitted records. Each dashboard is viewable and editable. See [Dashboard Details](#dashboard-details) below. |
| **Reports**               | Submenu                                 | Report generation. Submenu items vary by customer setup.                                                                                                            |
| **Process Design Studio** | `/ProcessDesignStudio?access_token=...` | Visual workflow (BPMN-style) designer. Token-authenticated. Separate app.                                                                                           |
| **Admin Tools**           | Dropdown                                | Users, Groups, Portals, Menus, Dropdown Lists, Site Administration (Locations, Customers, Suppliers)                                                                |
| **Enterprise Tools**      | Via Control Panel                       | Microservices, Scheduled Services, Data Connections, Data Connection Queries — see below                                                                            |

---

## Dashboard Details

### Dashboard List vs Dashboard Detail

The **Dashboards** nav item (`/formdata`) shows a list of all form dashboards. Clicking a dashboard opens the detail view:

```
/FormDataDetails?Mode=ReadOnly&ReportID={dashboardGUID}
```

- `Mode=ReadOnly` — standard view mode (records are read-only in the grid; click to open for editing)
- `ReportID` — GUID identifying which dashboard/report to display

### Rendering Technology

Dashboards use **Telerik RadGrid** (ASP.NET WebForms) — a **server-side rendered** grid component. The server queries the SQL database, formats values in .NET, and sends pre-rendered HTML. The browser renders static HTML with no client-side date processing.

**Key implication:** Browser timezone has **zero effect** on displayed date values. BRT, IST, and UTC0 users see byte-identical content for the same dashboard. This is fundamentally different from the FormViewer (Angular SPA with client-side `moment.js` date processing).

### Grid Structure

| Property       | Value                                                                |
| -------------- | -------------------------------------------------------------------- |
| Grid component | Telerik RadGrid (`.RadGrid`, `.rgMasterTable`)                       |
| Row classes    | `.rgRow` (even), `.rgAltRow` (odd)                                   |
| Header links   | `.GridHeaderLink` (sortable column headers)                          |
| Pager          | `.rgPagerCell` — configurable page size (10/15/20/25/50/100/200/500) |
| Default sort   | By Form ID descending (most recent first)                            |

**Row data attributes** (useful for Playwright automation):

- Checkbox `dhid` attribute = DataID (revisionId GUID)
- Checkbox `dhdocid` attribute = instance name (e.g., `DateTest-001584`)

**Column layout:** Columns are sorted **alphabetically** by field name (Field1, Field10, Field11, ..., Field2, Field20, ..., Field7), not numerically. The first column is always Form ID.

### Date Display Format

The server formats dates based on the field's `enableTime` property:

| enableTime | Server Format      | Example             |
| :--------: | ------------------ | ------------------- |
|  `false`   | `M/d/yyyy`         | `3/15/2026`         |
|   `true`   | `M/d/yyyy h:mm tt` | `3/15/2026 3:00 AM` |

The `ignoreTimezone` and `useLegacy` flags do **not** affect the server-side display format — only `enableTime` matters.

### Features

| Feature          | Details                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sort**         | Click any column header to sort ascending/descending (server postback via `__doPostBack`)                                                                                            |
| **Search**       | SQL filter builder (`a[title="Toggle search toolbar display"]`) — see [SQL Filter](#sql-filter-behavior) below                                                                       |
| **Export**       | Excel (`.xls`), Word (`.doc`), XML (`.xml`) — inside a collapsible dock panel (hidden by default, toggle via toolbar "Export" button). See [Export Behavior](#export-behavior) below |
| **Print**        | Print dialog with page range selection                                                                                                                                               |
| **Record click** | `VV.OpenWindow()` opens `FormDetails?DataID=...&Mode=ReadOnly&hidemenu=true` in a popup (loads VV.Form on main page, no iframe)                                                      |
| **Pagination**   | Server-side paging with configurable page size                                                                                                                                       |

### Sort Behavior

Dates sort **chronologically** (as proper datetime values), not alphabetically as text. Time components are included in DateTime sort (e.g., `3/15 5:30 PM` sorts after `3/15 2:30 PM` on the same date).

**Empty cell positioning:** Empty cells sort to **TOP** in ascending order and **BOTTOM** in descending order.

**Playwright note:** `__doPostBack` in Playwright's `page.evaluate()` fails because ASP.NET's `PageRequestManager._doPostBack` accesses `arguments.callee`, forbidden in strict mode. **Preferred workaround:** `page.addScriptTag({ content: "__doPostBack('target', '')" })` — injects a `<script>` tag that runs in the page's own non-strict context. Alternative: `page.goto('javascript:void(__doPostBack(...))')` — the navigation may reject but the postback still fires. After triggering, use `page.waitForResponse(resp => resp.request().method() === 'POST')` to detect the AJAX partial postback completion (not `waitForNavigation`, which times out for UpdatePanel postbacks).

### SQL Filter Behavior

The dashboard has a **hidden SQL filter panel** (`txtSQLFilter` textarea) that accepts raw SQL WHERE clauses. It can be driven programmatically by setting the textarea value and triggering `__doPostBack` on the Update button.

**Date comparison semantics on DateTime columns:**

| Query                                     | Behavior                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `Field6 = '3/15/2026'`                    | Matches **midnight only** — server treats date-only input as `3/15/2026 12:00 AM` |
| `Field6 >= '3/15' AND <= '3/15 11:59 PM'` | Matches **all times** on that date — use range queries for DateTime columns       |

Date-only columns (`enableTime=false`) are unaffected — `=` works as expected because all values store midnight.

### Cross-Layer Format Difference

The dashboard and the Forms Angular SPA use different date format strings:

| Layer     | Format       | Example      |
| --------- | ------------ | ------------ |
| Dashboard | `M/d/yyyy`   | `3/15/2026`  |
| Forms SPA | `MM/dd/yyyy` | `03/15/2026` |

For DateTime fields with `ignoreTZ=false`, there is also a **time shift**: the dashboard renders the stored `datetime` value directly (e.g., `2:30 PM` for DB value `14:30:00.000`), while Forms V1 shifts the time because `FormInstance/Controls` serializes postForms-created records with a Z suffix that V1 interprets as UTC (e.g., `11:30 AM` in BRT = 14:30 − 3h). Fields with `ignoreTZ=true` preserve the display time but still differ in leading-zero format.

### Export Behavior

The export dock panel (`dockExport`) starts **hidden** (`display: none`). The "Export" toolbar button toggles its visibility. Export buttons inside the panel use `__doPostBack` to trigger server-side file generation.

**Format details:**

| Format | Extension | Actual Type | Structure                                                                                                                                                                       |
| ------ | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Excel  | `.xls`    | HTML        | Single `<table>` with `<td>` cells — same as grid display. Opens in Excel via HTML import.                                                                                      |
| Word   | `.doc`    | HTML        | Identical to Excel (same HTML table). Only the MIME type differs.                                                                                                               |
| XML    | `.xml`    | XML         | `<VisualVault>` root with XSD schema. Row elements: `<DateTest>`. Field names use `_x0020_` for spaces (e.g., `Form_x0020_ID`). Dates in ISO 8601: `2026-03-15T00:00:00+00:00`. |

**Scope:** All exports include **ALL records** across all pages (not just the current page). A dashboard with 432 records and page size 200 still exports all 432 rows.

**Date format differences from grid:**

- Excel/Word: Date-only fields get `12:00:00 AM` appended (e.g., grid `3/15/2026` → export `3/15/2026 12:00:00 AM`). DateTime fields match grid format.
- XML: All dates are ISO 8601 with `+00:00` UTC offset. Calendar dates match grid.

**Export button IDs** (for automation):

| Button | ID                                                                    |
| ------ | --------------------------------------------------------------------- |
| Excel  | `ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport_C_btnExcelExport2` |
| Word   | `ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport_C_btnWordExport2`  |
| XML    | `ctl00_ContentBody_ctrlPanelHolder_ctl0_dockExport_C_btnXMLExport2`   |

**Reproducible test:** `npx playwright test testing/date-handling/dash-export.spec.js` (or individual format: `--grep "excel export"`)

### DataID = revisionId

The `DataID` parameter in the FormViewer URL corresponds to the `revisionId` returned by the VV REST API (also available as the last path segment of the `href` field in form query results). There is no separate `dataId` field in API responses.

---

## FormTemplateAdmin Details

The **Form Templates** page (`/FormTemplateAdmin`) uses Telerik RadGrid — the same framework as dashboards — but with a different column layout and row-level actions for template management.

### Grid Structure

| Property          | Value                                                                     |
| ----------------- | ------------------------------------------------------------------------- |
| Table ID          | `ctl00_ContentBody_DG1_ctl00`                                             |
| CSS class         | `rgMasterTable rgClipCells`                                               |
| Row classes       | `.rgRow` (even), `.rgAltRow` (odd) — same as Dashboard                    |
| Pager style       | `NextPrevAndNumeric` — numbered page links + First/Prev/Next/Last buttons |
| Default page size | 15 rows (configurable via `rcbInput radPreventDecorate` combo)            |

### Column Layout (12 columns)

| Index | Column            | Content / Element                                                                |
| :---: | ----------------- | -------------------------------------------------------------------------------- |
|   0   | (Select)          | Empty/checkbox                                                                   |
|   1   | Category          | e.g., "None"                                                                     |
|   2   | **Template Name** | Key identifier (used for lookups)                                                |
|   3   | Form Design       | "View" link (`lnkView`)                                                          |
|   4   | Description       | Template description text                                                        |
|   5   | Status            | "Released" (live) or "Release" (draft)                                           |
|   6   | New Rev           | Link to create new revision (`lnkNewRevision`)                                   |
|   7   | Revision          | Version number (e.g., "2.3")                                                     |
|   8   | Import            | `<a onclick="DisplayFileUploadForImport(this)">` — can be `aspNetDisabled`       |
|   9   | **Export**        | `<a title="Export Form Template" href="javascript:__doPostBack(...)">Export</a>` |
|  10   | Copy              | `<a>` link (`lnkCopyTemplate`)                                                   |
|  11   | Modified Date     | e.g., "5/22/2025 12:21 PM"                                                       |

### Export Mechanism

The Export link triggers `__doPostBack(eventTarget, '')` which sends a server-side request to generate the template XML. The server responds with a file download (Content-Disposition attachment). This is an **AJAX partial postback** (UpdatePanel) — the grid refreshes after the download starts.

The downloaded XML is a `<FormEntity>` document containing the full template definition: metadata, pages, fields, scripts, groups/conditions, and PDF settings. See `docs/reference/form-template-xml.md` for the XML format reference.

### Pagination

Pager buttons use ASP.NET `__doPostBack` for page changes:

- **Numbered page links** (`.rgNumPart a`): `href="javascript:__doPostBack('ctl00$ContentBody$DG1$ctl00$ctl03$ctl01$ctlNN', '')"` — link text is the page number
- **Current page**: marked with `class="rgCurrentPage"` and `onclick="return false;"` (no-op click)
- **Arrow buttons** (`.rgPageFirst`, `.rgPagePrev`, `.rgPageNext`, `.rgPageLast`): `<input type="button">` with `onclick="return false;__doPostBack(...)"`

**Automation note:** Page size combo box supports values like 15 (default). To show all rows, change via the RadComboBox client API or iterate pages.

---

## Authentication & Login

### Post-Login Redirect

Different VV environments redirect to different pages after successful login:

| Environment | Redirect Target                              | Notes                               |
| ----------- | -------------------------------------------- | ----------------------------------- |
| `vvdemo`    | `/app/{customer}/{db}/FormDataAdmin`         | Standard VV shell with Form Library |
| `vv5dev`    | `/VVPortalUI/home?access_token=<long token>` | Portal UI with access token in URL  |

**Playwright implication:** Cannot use a fixed `waitForURL('**/FormDataAdmin**')` pattern for all environments. Use a generic post-login detection like checking that the URL path is no longer `/` or a login path.

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

**REST API:** `GET /outsideprocesses` returns all registered microservices with metadata: `id`, `name`, `description`, `processCategory` (0=Form, 1=Scheduled, 5=Workflow), `processType`, `createDate`, `createBy`, `modifyDate`, `modifyBy`. Does **NOT** include script source code. Individual resource fetch (`GET /outsideprocesses/{id}`) returns HTTP 405 — not supported.

**WADNR stats (2026-04-08):** 272 registered microservices (44 Form, 19 Scheduled, 209 Workflow).

#### Microservice Detail Panel

Clicking a service name in the grid opens an inline **"MICROSERVICE DETAILS"** dock panel (Telerik RadDock, not a popup or separate page). The panel opens via ASP.NET `__doPostBack` AJAX partial postback.

**Detail panel fields:**

| Field                      | Element             | Notes                                                            |
| -------------------------- | ------------------- | ---------------------------------------------------------------- |
| Name                       | `txtOpName`         | Service name (editable)                                          |
| Description                | `txtDescription`    | (editable)                                                       |
| Service Type               | `ddlCategory`       | Dropdown                                                         |
| Connection Type            | `ddlConnectionType` | Dropdown                                                         |
| Timeout                    | `txtServiceTimeout` | Long Running Service Settings section                            |
| Allow anonymous access     | checkbox            | Security Settings section                                        |
| IP Address Restrictions    | text                | Security Settings section                                        |
| Enable completion callback | checkbox            | Completion callback section                                      |
| **Script source**          | `txtScriptCode`     | Full textarea ID: `ctl00_ContentBody_dockDetail_C_txtScriptCode` |
| Script ID                  | `lblScriptId`       | GUID displayed at bottom of panel                                |

**Grid column layout (10 columns, verified 2026-04-08):**

| Index | Column              | Notes                                      |
| :---: | ------------------- | ------------------------------------------ |
|   0   | (Select)            | Checkbox                                   |
|   1   | Service Name        | `lnkDetails` link — click opens dock panel |
|   2   | Service Description | Text                                       |
|   3   | Category            | ScriptType text                            |
|   4   | Service Type        | "NodeServer"                               |
|   5   | Timeout             | Numeric                                    |
|   6   | Callback            | Boolean text                               |
|   7   | ModifiedDate        | Timestamp                                  |
|   8   | ModifiedBy          | Email                                      |

**Automation (Playwright):** Script source extraction must use **response interception** (parse the AJAX response body for the textarea content) rather than DOM reads. The dock panel's textarea value becomes stale if the panel is hidden via CSS — hiding the panel prevents ASP.NET UpdatePanel from updating its content. Use `page.addScriptTag({ content: "__doPostBack(target, '')" })` to trigger postbacks (avoids strict-mode `arguments.callee` errors in `page.evaluate`). Response format is ASP.NET UpdatePanel delta: `length|type|id|content|...` (pipe-delimited).

### Scheduled Services

**URL:** `/scheduleradmin`
**UI Label:** "Scheduled Services"
**Breadcrumb:** Control Panel > Enterprise Tools > Scheduled Services

Cron-like configuration for automated scripts. Each schedule references a Microservice by name. No REST API exists for listing schedules — the `scheduledProcess` manager only exposes `postCompletion()` and `runAllScheduledProcesses()`.

**Grid column layout (verified 2026-04-08, WADNR: 21 schedules):**

| Index | Column        | Type     | Notes                                                                     |
| :---: | ------------- | -------- | ------------------------------------------------------------------------- |
|   0   | (Select)      | checkbox | Row selection                                                             |
|   1   | Name          | link     | Schedule name (`lnkDetails`)                                              |
|   2   | (View)        | link     | Detail view link                                                          |
|   3   | Enable        | text     | `"True"` / `"False"` (not a checkbox)                                     |
|   4   | Run State     | text     | `"Idle"` when not running                                                 |
|   5   | Set to Idle   | button   | `"Reset"` button (force-stops if stuck)                                   |
|   6   | Last Run Date | text     | Timestamp of last execution, or `"Not Run Yet"`                           |
|   7   | Recurrence    | text     | e.g., `"Every 2 Minutes"`, `"Every 365 Days"`, `"Recurrence Not Enabled"` |
|   8   | Next Run Date | text     | Calculated next execution timestamp                                       |
|   9   | Service Name  | text     | References a Microservice from `/outsideprocessadmin`                     |

**Note:** The documented column order had 8 columns, but the actual grid has 10 (index 2 "View" link and index 5 "Set to Idle" button were not listed). Verified by grid scraping on vv5dev/WADNR/fpOnline.

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

Form field values are stored in SQL Server tables named after the form template. Each form template maps to one table. Schema confirmed via SSMS inspection (2026-04-06):

| Column                             | SQL Type           | Nullable | Notes                                              |
| ---------------------------------- | ------------------ | :------: | -------------------------------------------------- |
| `DhDocID`                          | `nvarchar(255)`    |    PK    | Form instance identifier (e.g., `DateTest-001584`) |
| `DhID`                             | `uniqueidentifier` |    No    | Internal GUID                                      |
| `VVCreateDate`, `VVModifyDate`     | `datetime`         |    No    | System timestamps                                  |
| `VVCreateBy`, `VVModifyBy`         | `nvarchar(256)`    |    No    | User email                                         |
| `VVCreateByUsID`, `VVModifyByUsID` | `uniqueidentifier` |    No    | User GUID                                          |
| `Field1` through `Field28`         | **`datetime`**     |   Yes    | All date fields — no `date`-only type exists       |
| `WSAction`, `WSConfigs`, etc.      | `nvarchar(max)`    |   Yes    | Test harness metadata (string fields)              |

Example query to inspect a saved record:

```sql
SELECT DhDocID, Field5, Field6, Field7
FROM DateTest
WHERE DhDocID = 'DateTest-001584'
```

**Date storage in SQL Server:** All date fields are **`datetime`** (binary, format-agnostic). The raw value serializes as `YYYY-MM-DD HH:MM:SS.mmm` (e.g., `2026-03-15 14:30:00.000`). The `M/d/yyyy h:mm:ss tt` format seen in the VV Query Admin Preview (e.g., `3/15/2026 2:30:00 PM`) is **.NET display formatting**, not the stored value. There is no timezone information at the SQL level — the `datetime` type is timezone-unaware. Empty fields store `NULL`.

**Critical implication:** Since there is no `date` column type, the `enableTime` flag is purely a client-side presentation control. Every "date-only" field can contain any time component depending on the write path. See [No Server-Side Date-Only Enforcement](#no-server-side-date-only-enforcement) below.

**VV demo server timezone:** Confirmed as **BRT (UTC-3)** by comparing `VVCreateDate` (server local timestamp) with `Field1` (`new Date().toISOString()` = UTC). Consistent 3-hour offset across all records (e.g., `VVCreateDate=12:53`, `Field1=15:53`). The server stores `VVCreateDate`/`VVModifyDate` in its local timezone, while `toISOString()`-derived field values are stored in UTC. `getSaveValue()`-derived values are timezone-ambiguous (local midnight stored as `00:00:00.000` regardless of actual UTC offset).

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

## FormsAPI Service

The FormViewer SPA communicates with a **separate .NET service** (FormsAPI) for form instance persistence. This is distinct from the core VV REST API.

| Property       | Value                                                                           |
| -------------- | ------------------------------------------------------------------------------- |
| Base URL       | `https://preformsapi.visualvault.com/api/v1`                                    |
| Authentication | JWT (not OAuth) — obtained via `GET /users/getjwt` on core API                  |
| Discovery      | `GET /configuration/formsapi` on core API returns `formsApiUrl` and `isEnabled` |
| Node.js client | `vvClient.formsApi.formInstances` (auto-initialized if enabled)                 |

### FormsAPI Endpoints (discovered via network intercept)

| Method | Endpoint                                                            | Purpose                                                                      |
| ------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/FormTemplate/<defId>?revisionType=2`                              | Template definition (by definition GUID)                                     |
| GET    | `/FormTemplate/<revId>?revisionType=0`                              | Template by revision ID                                                      |
| GET    | `/FormTemplate/Controls/<revId>?formInstanceId=<id>&revisionType=2` | Field definitions for a template                                             |
| GET    | `/FormInstance/Controls/<dataId>?revisionType=1`                    | **Saved field values** (serialized — format varies by write path, see CB-29) |
| POST   | `/FormInstance`                                                     | Create a new form record                                                     |
| PUT    | `/FormInstance`                                                     | Update existing record                                                       |
| POST   | `/FormInstance/lock`                                                | Lock a record for editing                                                    |
| GET    | `/FormTemplate/<defId>/NextInstance?revisionType=2`                 | Get next instance name                                                       |
| GET    | `/Menu/Tab/<id>`                                                    | Tab configuration                                                            |
| GET    | `/FormSettings`                                                     | Global form settings                                                         |
| GET    | `/DefaultValues`                                                    | Default field values/settings                                                |

### Serialization Format Difference (CB-29)

Both the core API (`postForms`) and FormsAPI (`forminstance/`) store **identical `datetime` values** in SQL Server. A DB dump (2026-04-06) confirmed records created by either endpoint contain the same binary value (e.g., `2026-03-15 14:30:00.000`).

The difference is in how `FormInstance/Controls` **serializes its HTTP response**:

| Write Endpoint           | DB Value (identical)      | `FormInstance/Controls` Response | Forms V1 Interpretation                |
| ------------------------ | ------------------------- | -------------------------------- | -------------------------------------- |
| Core API `postForms`     | `2026-03-15 14:30:00.000` | `"2026-03-15T14:30:00Z"` (ISO+Z) | UTC → converts to local (shifted)      |
| FormsAPI `forminstance/` | `2026-03-15 14:30:00.000` | `"03/15/2026 14:30:00"` (US)     | Local time → no conversion (preserved) |

The core API's `getForms` normalizes both to ISO+Z, masking the serialization difference. The divergence is only visible through `FormInstance/Controls` or by observing the Forms UI behavior.

**How Controls decides the format**: The form data table (`dbo.DateTest`) contains no column or flag that distinguishes records by creation endpoint — a column-by-column DB comparison of postForms vs forminstance/ records (DateTest-001679 vs DateTest-001680) shows identical metadata. The serialization decision is based on **hidden internal metadata** in VV's revision/instance tracking tables, not in the form data table. The specific table and field have not been identified.

**Root cause**: The FormsAPI has two serialization paths that produce different string formats for the same `datetime` value. Forms V1 `initCalendarValueV1` parses the string format — ISO+Z triggers UTC→local conversion, US format does not.

See `tasks/date-handling/web-services/analysis/overview.md` CB-29 for full evidence.

---

## Key Concepts & GUIDs

- **`formid`** — identifies a Form Template **definition**. Stable across versions. Used in form viewer URL and FormsAPI template lookup.
- **`xcid`** — identifies the customer in the VV database.
- **`xcdid`** — identifies the specific database within the customer.
- **`CcID`** — Connection ID for a Data Connection; used in query URLs.
- **Revision** — form templates are versioned. Scripts reference a specific revision or "Released" status.
- **Status:** `Released` = live/published; `Release` = draft/in-progress (UI inconsistency — "Release" means it hasn't been released yet).

### Form Template ID Hierarchy

A form template has **three different GUIDs** used by different parts of the system:

| ID Type              | Example (DateTest)                     | Where Used                                             | How to Get                                                             |
| -------------------- | -------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Form Definition GUID | `6be0265c-152a-f111-ba23-0afff212cc87` | Form viewer URL `formid=`, FormsAPI template lookup    | URL bar, `vv-config.js`                                                |
| Template ID          | `1c6e433e-f36b-1410-896b-005f6a77cdf8` | Core API `/formtemplates/{id}/forms`                   | `vvClient.forms.getFormTemplateIdByName()` → `.templateIdGuid`         |
| Revision ID          | `ef82433e-f36b-1410-896b-005f6a77cdf8` | FormsAPI `POST /FormInstance` (`formTemplateId` field) | `vvClient.forms.getFormTemplateIdByName()` → `.templateRevisionIdGuid` |

The core API `postForms()` takes a template name and resolves it automatically. The FormsAPI `postForm()` requires the **revision ID** explicitly.

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

| Form                          | Template GUID                                    | Template URL                                                                                                                                                                                             | Notes                                                                     |
| ----------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| DateTest                      | `6be0265c-152a-f111-ba23-0afff212cc87`           | `https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=6be0265c-152a-f111-ba23-0afff212cc87&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939`           | 8 date fields across all calendar configs; creates new instance each load |
| DateTest Dashboard            | ReportID: `e522c887-e72e-f111-ba23-0e3ceb11fc25` | `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/FormDataDetails?Mode=ReadOnly&ReportID=e522c887-e72e-f111-ba23-0e3ceb11fc25`                                                                       | 467 records (as of 2026-04-06); Telerik RadGrid, server-rendered          |
| DateTest-000004 Rev 1 (saved) | —                                                | `https://vvdemo.visualvault.com/FormViewer/app?DataID=2ae985b5-1892-4d26-94da-388121b0907e&hidemenu=true&rOpener=1&xcid=815eb44d-5ec8-eb11-8200-a8333ebd7939&xcdid=845eb44d-5ec8-eb11-8200-a8333ebd7939` | Saved record from BRT session; use for reload/cross-TZ tests              |

---

## WADNR Environment Reference

| Item                           | Value                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| Environment                    | `vv5dev`                                                   |
| Customer                       | `WADNR`                                                    |
| Database                       | `fpOnline`                                                 |
| Base URL                       | `https://vv5dev.visualvault.com/app/WADNR/fpOnline/`       |
| Customer GUID (`xcid`)         | `8b91162d-6e44-ef11-8295-92af04f88cc9`                     |
| Database GUID (`xcdid`)        | `e8de4be1-6f44-ef11-8295-92af04f88cc9`                     |
| Form templates                 | 228 total (89 active, 139 z-prefixed) as of 2026-04-07     |
| Templates with calendar fields | 35 of 77 exported (some exports failed server-side)        |
| Microservices registered       | 272 (44 Form, 19 Scheduled, 209 Workflow) as of 2026-04-08 |
| Scheduled services             | 21 (13 enabled, 8 disabled) as of 2026-04-08               |
| Global functions (runtime)     | 182 keys (157 functions + 25 properties) as of 2026-04-08  |

**Top calendar field counts** (FieldCalendar3 per template):

| Template                   | Calendar Fields |
| -------------------------- | :-------------: |
| Application Review Page    |       35        |
| Notification Communication |       13        |
| Notice to Comply           |        9        |
| Multi-purpose              |        6        |
| WTM Review Page            |        5        |
| FPAN Notice of Decision    |        5        |
| Forest Practices App/Notif |        5        |

**Exported templates:** 77 of 89 active templates exported to `tasks/date-handling/wadnr-impact/form-templates/` via `testing/scripts/export-wadnr-templates.js`. 12 templates consistently failed (server-side export timeout).

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

The VV REST API returns field names in **camelCase** in response objects (e.g., `dataField7` instead of `Field7`). When writing data, the API accepts the original mixed casing. Scripts must account for this asymmetry when reading field values from API responses vs. constructing field data for writes.

### Date Format Normalization

The VV REST API normalizes all date values in responses to ISO 8601 datetime with Z suffix (e.g., `"2026-03-15T00:00:00Z"`). Even date-only fields stored as `"2026-03-15"` by Forms are returned as `"2026-03-15T00:00:00Z"` by the API. Unset date fields return `null`. This normalization is performed by the VV server, not the Node.js client library.

### No Server-Side Date-Only Enforcement

The VV server has no date-only storage type. All date fields are stored as datetime, regardless of the `enableTime` flag. The "date-only" semantic is enforced only by the Forms client-side JS — the API and database treat all date fields identically. This means a "date-only" field can contain UTC midnight, local midnight as UTC, actual timestamps, or arbitrary times depending on the write source (Forms popup, preset, Current Date, or API). See `tasks/date-handling/web-services/analysis/overview.md` for full evidence and impact analysis.

### Data Passthrough

The Node.js client library (`lib/`) performs **no data transformation** between script code and the VV server. Field values (including dates) are serialized via `JSON.stringify()` on the way out and `JSON.parse()` on the way back. Dates remain as strings throughout — never converted to/from JavaScript `Date` objects by the library. See [Scripting Guide](../guides/scripting.md) for the full data flow.

### API Write Path Stores Dates Uniformly

The VV REST API write path (`postForms`, `postFormRevision`) stores date strings as-is without applying config-specific transformations. All field configurations (A through H, regardless of `enableTime`, `ignoreTimezone`, or `useLegacy` flags) store the same input identically. For example, `"2026-03-15"` sent to Configs A, B, C, and D via `postForms` all store as `2026-03-15 00:00:00.000` in SQL Server.

This contrasts with the **Forms browser save path**, where the Angular `getSaveValue()` pipeline applies different transformations per config: Config C stores real UTC (midnight BRT → `T03:00:00`), Config D stores local midnight as-is (`T00:00:00`), and date-only fields in UTC+ timezones store the wrong day (FORM-BUG-7). The mixed timezone storage problem is **exclusively a Forms Angular issue** — the API path is immune.

**Implication**: Developers writing dates via the REST API get consistent, predictable storage regardless of field config. The API is the safer write path for date-critical workflows.

---

## External Documentation

- Official docs: https://docs.visualvault.com/docs
