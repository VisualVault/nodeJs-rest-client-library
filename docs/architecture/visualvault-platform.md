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
- `xcid` — customer identifier (accepts both GUID and alias string, e.g., `EmanuelJofre`)
- `xcdid` — database identifier (accepts both GUID and alias string, e.g., `Main`)
- `hidemenu=true` — hides the VV navigation shell (typical for end-user forms)

Note: `xcid`/`xcdid` accept customer/database **alias strings** as well as GUIDs. Using aliases is simpler when building URLs from config. The REST API `getFormTemplates()` response does NOT include `customerId` or `customerDatabaseId` fields, so you cannot obtain GUIDs from template metadata — use `customerAlias`/`databaseAlias` from your config instead. Verified 2026-04-09 on vvdemo.

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

### Document Detail (opens a document's properties in a popup)

```
https://{env}.visualvault.com/app/{customer}/{database}/DocumentDetails?DhID={documentHistoryId}&hidemenu=true
```

- `DhID` — the document history ID (different from `documentId` — see API response `id` field vs `documentId` field)
- Opens in a popup window via `VV.OpenWindow()` when clicking a document name in the Document Library grid
- Contains 11 tabs: Details, Parent, Children, Related, Forms, Projects, ID Card, **Index Fields**, Revisions, History, Security
- Index Fields tab shows editable date/text/dropdown fields when document is checked out

---

## Navigation Map

All sections are accessed from the top nav bar within `https://{env}.visualvault.com/app/{customer}/{database}/`:

| Nav Label                  | URL Path                                             | Description                                                                                                                              |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Document Library**       | `/DocumentLibrary`                                   | Folder-tree document storage. Left panel = folder tree, right = file list. Has a Recycle Bin. Breadcrumb: `Documents > Document Library` |
| **Form Templates**         | `/FormTemplateAdmin`                                 | Admin view to create/manage form schemas. Breadcrumb: `Forms > Form Template Administration`                                             |
| **Form Library**           | `/FormDataAdmin`                                     | End-user list of all forms available to fill in. Each row has a "Fill-In" link. Breadcrumb: `Forms > Form Library`                       |
| **Dashboards**             | `/formdata`                                          | List of dashboards showing submitted records. Breadcrumb: `Forms > Form Data Dashboards`. See [Dashboard Details](#dashboard-details)    |
| **Reports** (submenu)      | —                                                    | Dropdown with sub-items below                                                                                                            |
| ↳ Analytics Dashboards     | `/Dashboards`                                        | Analytics/BI dashboards (separate from form dashboards). Note: UI label has typo "Dasboards"                                             |
| ↳ VV Reports               | `/VisualVaultReports`                                | Report generation and viewing                                                                                                            |
| **Process Design Studio**  | `/ProcessDesignStudio?access_token=...`              | Visual BPMN workflow designer. Separate app. Token is a long encrypted payload regenerated per session                                   |
| **Admin Tools** (dropdown) | —                                                    | See [Admin Tools](#admin-tools) below                                                                                                    |
| **Enterprise Tools**       | Via Control Panel                                    | Dropdown with sub-items below. Breadcrumb prefix: `Control Panel > Enterprise Tools`                                                     |
| ↳ Data Connections         | `/ConnectionsAdmin`                                  | SQL Server connections backing VV databases                                                                                              |
| ↳ Microservice Library     | `/OutsideProcessAdmin`                               | External service endpoints (nodeV2 scripts appear here)                                                                                  |
| ↳ Scheduled Services       | `/SchedulerAdmin`                                    | Cron-like automation for registered microservices                                                                                        |
| ↳ Module Library           | `/ModuleAdmin`                                       | Reusable module/component library                                                                                                        |
| ↳ Offline Forms            | `/OfflineForms/index.html#!/land?xcid=...&xcdid=...` | Offline form fill-in. Separate AngularJS SPA with its own routing                                                                        |

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

**Reproducible test:** `npx playwright test testing/specs/date-handling/dash-export.spec.js` (or individual format: `--grep "excel export"`)

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

Accessible from the "Admin Tools" dropdown in the top nav bar:

| Item                           | URL Path                                     | Description                                              |
| ------------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| Users                          | `/UserAdmin`                                 | User management — create, edit, assign groups            |
| Groups                         | `/GroupAdmin`                                | Security groups — control access to forms, documents     |
| Portals                        | `/VisualVaultAdmin?SecurityType=PortalAdmin` | Customer-facing portal configuration                     |
| Menus                          | `/MenuAdmin`                                 | Custom navigation menus for portals                      |
| Dropdown Lists                 | `/DropDownListAdmin`                         | Shared dropdown/lookup lists reusable across form fields |
| Email Templates                | `/EmailTemplateAdmin`                        | Email notification templates                             |
| Site Administration: Locations | `/siteadmin?SecurityType=Location`           | Physical location definitions                            |
| Site Administration: Customers | `/siteadmin?SecurityType=Customer`           | Customer entity management                               |
| Site Administration: Suppliers | `/SiteAdmin?SecurityType=Supplier`           | Supplier entity management                               |

Note: Portals uses `/VisualVaultAdmin?SecurityType=PortalAdmin` (not `/PortalAdmin`). Site Admin sections use parameterized `/siteadmin?SecurityType=` URLs.

---

## User Menu

The user menu (top-right, shows the logged-in user's email) provides quick links via ASP.NET postbacks:

| Item            | URL / Mechanism                        | Description                                     |
| --------------- | -------------------------------------- | ----------------------------------------------- |
| Searches        | postback `lnkSearches`                 | Saved search management                         |
| Training        | postback `lnkTraining`                 | Training resources                              |
| Open Forms      | postback `lnkOpenForms`                | Forms currently open/in-progress                |
| Email Alerts    | postback `lnkEmailAlerts`              | Notification preferences                        |
| My Preferences  | `/UserProfile`                         | User profile and settings                       |
| Control Panel   | `/ControlPanel`                        | Admin control panel (leads to "My Preferences") |
| Central Admin   | postback `lnkCentralAdmin`             | Cross-customer administration                   |
| Advanced Search | `/AdvancedSearch?newsearch=true`       | Full-text search across documents and forms     |
| Saved Searches  | `/UserSearches`                        | Persisted search queries                        |
| Logout          | `/Login/{customer}/{db}?action=logout` | Session logout                                  |

### Language Support

The UI includes a language selector with: English, Brazil Portuguese, Spanish (Peru), Spanish (Colombia), Chinese (Simplified). Hidden field: `ctl00_CtrlMenu1_ddlLanguagesV5_ClientState`.

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

## Version & Build Information

### Version API Endpoint

```
GET /api/v1/{customer}/{db}/version
Authorization: Bearer {accessToken}
```

Returns `VaultVersionInfo` — the core platform version and database schema version:

```json
{
    "data": {
        "dataType": "VaultVersionInfo",
        "progVersion": "5.1.20210525.1",
        "dbVersion": "3041",
        "dbCreateDate": "2021-06-08T13:35:21.493Z",
        "dbModifiedDate": "2021-06-08T13:35:21.493Z",
        "progCreateDate": "2021-06-08T13:35:21.493Z",
        "progModifiedDate": "2021-06-08T13:35:21.493Z",
        "utcOffset": -3
    }
}
```

- `progVersion` follows the build format `{major}.{minor}.{YYYYMMDD}.{buildNum}` — tracks the **core platform**, not individual services
- `dbVersion` is the database schema version number (incremented by migrations)
- `utcOffset` reflects the server's configured UTC offset
- Verified 2026-04-09 on vvdemo

### FormViewer Build Number

The FormViewer Angular SPA exposes build info via a **static JSON file** — no authentication or browser needed:

```
GET /FormViewer/assets/build.json     (no auth required)
→ { "build": 20260304.1, "code": "v0.5.1" }

GET /FormViewer/assets/config.json    (no auth required)
→ { "production": false, "formsApiUrl": "...", "socketsUrl": "...", "audience": "...", ... }
```

| Property         | Value                              | Source                                           |
| ---------------- | ---------------------------------- | ------------------------------------------------ |
| Build number     | `20260304.1`                       | `build.json` → `build` field                     |
| Code version     | `v0.5.1`                           | `build.json` → `code` field (semver)             |
| DOM display      | `Build: 20260304.1`                | `span.app-version` in top-right corner           |
| Environment mode | `production: false`                | `config.json` (false = pre-production on vvdemo) |
| Sockets URL      | `sockets-pre.visualvault.com`      | `config.json` → `socketsUrl`                     |
| JWT audience     | `e98f5a306fed4a279a2837dee47751b6` | `config.json` → `audience`                       |
| Verified         | 2026-04-09 on vvdemo               |                                                  |

`config.json` also reveals all backend service URLs, matching the `/configuration/*` API endpoints but without authentication.

FormViewer uses Angular content-hashed filenames for its script bundles (e.g., `main-es2015.37f6d018a9cad175a1e6.js`). These hashes change per deploy, providing a secondary deploy detection signal.

### What's NOT Exposed

The product team notifies deploys with Azure DevOps build names like `FormsAPI.Main.20260408.1`, but **individual service versions are not queryable**. The individual services (FormsAPI, DocAPI, WorkflowAPI) authenticate via JWT (not OAuth) and return `x-stackifyid` headers (APM tracking) but no version endpoints. The `/version` API only tracks the core platform, and `build.json` only tracks the FormViewer SPA.

### Server Infrastructure Headers

All responses from the main VV app include:

| Header                | Value                | Notes                              |
| --------------------- | -------------------- | ---------------------------------- |
| `Server`              | `Microsoft-IIS/10.0` | Windows Server IIS                 |
| `X-AspNet-Version`    | `4.0.30319`          | .NET Framework 4.x                 |
| `X-AspNetMvc-Version` | `5.2`                | ASP.NET MVC 5.2 (admin pages only) |

The `/App/` MVC routes include the MVC version header; API routes do not.

---

## UI Framework Stack

The main VV application (non-FormViewer pages) uses a classic ASP.NET WebForms stack with Telerik UI components. Verified on vvdemo 2026-04-09.

### Client-Side Libraries

| Library             | Version      | Role                       |
| ------------------- | ------------ | -------------------------- |
| jQuery              | 3.7.1        | DOM manipulation, AJAX     |
| Kendo UI            | 2020.1.406   | Grid widgets, datepickers  |
| Telerik RadControls | ASP.NET AJAX | Primary UI component suite |
| Bootstrap           | CSS only     | Layout and styling         |
| RequireJS           | present      | JavaScript module loader   |

### Telerik Controls in Use

RadGrid, RadMenu, RadButton, RadComboBox, RadAjaxPanel, RadInput, RadToolBar, RadUploadWindow, RadComboBoxDropDown (9 distinct controls observed).

### Server-Side

- **ASP.NET WebForms** — ViewState present (`__VIEWSTATE` hidden field), `__doPostBack` event system
- **Auersoft.SessionTimer** v4.0.0.0 — custom session timeout management library
- **ASP.NET MVC 5.2** — used for some routes (admin pages return `X-AspNetMvc-Version` header)

### UIServices (ASMX Web Services)

The main app loads 5 classic ASP.NET ASMX web services for real-time UI operations:

| Service             | Path                                      | Purpose                       |
| ------------------- | ----------------------------------------- | ----------------------------- |
| ContextMenuService  | `/UIServices/ContextMenuService.asmx/js`  | Right-click context menus     |
| UploadStatusService | `/UIServices/UploadStatusService.asmx/js` | File upload progress tracking |
| ThreadStatusService | `/UIServices/ThreadStatusService.asmx/js` | Background thread monitoring  |
| LibraryService      | `/UIServices/LibraryService.asmx/js`      | Document library operations   |
| FormService         | `/UIServices/FormService.asmx/js`         | Form-related UI operations    |

### Key JavaScript Objects

| Object                   | Properties                   | Purpose                                                             |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------- |
| `VV.MasterPage`          | 27 keys                      | Master page config: loading panels, menus, routing, session timeout |
| `VV.Notifications`       | 9 methods                    | Real-time notification system (show, dismiss, ack)                  |
| `VV.Entities`            | 3 keys                       | Entity types: Guid, FolderIndexFieldType, getFormFieldType          |
| `VV.Form`                | 121 keys                     | Form API (also available in FormViewer, different context)          |
| `window.VaultMaster`     | 4 keys                       | Master message/slider windows, Ajax helpers, JSON helpers           |
| `window.Auersoft`        | SessionTimer, VisualVault    | Session management namespace                                        |
| `window.vv.dataServices` | 1 key                        | Data services layer                                                 |
| `window.VVModules`       | Core, Common, ScriptResource | Module system                                                       |
| `window.NodeCategory`    | 5 enums                      | None, TopLevelFolder, Folder, DocumentList, Document                |

### Notification Polling

The main app polls `GET /App/{customer}/{db}/Notification` for real-time notifications. This is a standard ASP.NET MVC route (not REST API), returning notification data consumed by `VV.Notifications`.

---

## Service Architecture

The VV platform consists of multiple backend services, each running independently. The core API at `{env}.visualvault.com` acts as the gateway; individual services are discovered via `/configuration/*` endpoints.

### Configuration Discovery

```
GET /api/v1/{customer}/{db}/configuration/{component}
```

Returns the service URL and enabled status. Discovered services (vvdemo, 2026-04-09):

| Component        | URL                                                           | Enabled | Tech                     |
| ---------------- | ------------------------------------------------------------- | ------- | ------------------------ |
| FormsAPI         | `https://preformsapi.visualvault.com`                         | yes     | .NET                     |
| DocAPI           | `https://predocumentsapi.visualvault.com`                     | no      | .NET                     |
| StudioAPI        | `https://dbvvyys8gc.execute-api.us-east-1.amazonaws.com/Api/` | yes     | AWS API Gateway / Lambda |
| WorkflowAPI      | `https://preworkflow.visualvault.com`                         | yes     | .NET                     |
| ObjectsAPI       | (not configured)                                              | n/a     | —                        |
| NotificationsAPI | (not configured)                                              | n/a     | —                        |

### Sockets Service

Real-time notifications use a WebSocket/SignalR service:

| Property | Value                                            |
| -------- | ------------------------------------------------ |
| URL      | `https://sockets-pre.visualvault.com`            |
| Protocol | SignalR (`/notify/negotiate?negotiateVersion=1`) |
| Server   | `nginx/1.18.0 (Ubuntu)`                          |
| Auth     | Bearer JWT (same as FormsAPI)                    |

### Service Authentication

The main OAuth bearer token (from `/OAuth/Token`) is valid for the **core API only** (`/api/v1/...`). Individual services require a **JWT token** obtained via the core API:

```
GET /api/v1/{customer}/{db}/users/getjwt?audience={audience}
Authorization: Bearer {oauthToken}
→ { "data": { "token": "..." } }
```

The `audience` parameter comes from `config.json` (`e98f5a306fed4a279a2837dee47751b6` on vvdemo). The returned JWT works for FormsAPI, DocAPI, and WorkflowAPI. Without it, these services return `401.6 "Your session has expired or is invalid"`.

### APM / Monitoring

All .NET backend services (FormsAPI, DocAPI, WorkflowAPI) include a Stackify APM header:

```
x-stackifyid: V2|{requestGuid}|C100221|CD{instanceId}
```

- `C100221` — Stackify customer ID (VV's account)
- `CD23`/`CD24` — alternating deployment instance IDs (load-balanced, 2 instances observed)
- The request GUID changes per call; the C and CD values are stable per deployment

---

## FormsAPI Service

The FormViewer SPA communicates with a **separate .NET service** (FormsAPI) for form instance persistence. This is distinct from the core VV REST API. See [Service Architecture](#service-architecture) for the full service map and auth details.

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
- **`xcid`** — identifies the customer (accepts GUID or alias string like `EmanuelJofre`).
- **`xcdid`** — identifies the database (accepts GUID or alias string like `Main`).
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

| Item                        | Value                                                             |
| --------------------------- | ----------------------------------------------------------------- |
| Environment                 | `vvdemo`                                                          |
| Customer                    | `EmanuelJofre`                                                    |
| Database                    | `Main`                                                            |
| Base URL                    | `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/`           |
| Customer GUID (`xcid`)      | `815eb44d-5ec8-eb11-8200-a8333ebd7939`                            |
| Database GUID (`xcdid`)     | `845eb44d-5ec8-eb11-8200-a8333ebd7939`                            |
| Form DB connection CcID     | `00000001-0000-0000-0000-c0000000f002`                            |
| Form templates              | 122 (as of 2026-03)                                               |
| Microservices registered    | 42                                                                |
| Scheduled services          | 5                                                                 |
| Dashboards                  | 25                                                                |
| Custom queries              | 124                                                               |
| FormViewer build (observed) | `20260304.1` — `span.app-version` in top-right (as of 2026-04-09) |

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

**Exported templates:** 77 of 89 active templates exported to `projects/wadnr/extracts/form-templates/` via `tools/extract/extract-templates.js`. 12 templates consistently failed (server-side export timeout).

---

## Useful Direct URLs (demo environment)

All under `https://vvdemo.visualvault.com/app/EmanuelJofre/Main/` unless noted.

```
# Core sections
/                               # Main portal
/DocumentLibrary                # Document Library
/FormTemplateAdmin              # Form Templates (admin)
/FormDataAdmin                  # Form Library (fill-in list)
/formdata                       # Form Data Dashboards
/Dashboards                     # Analytics Dashboards
/VisualVaultReports             # VV Reports

# Enterprise Tools
/OutsideProcessAdmin            # Microservice Library
/SchedulerAdmin                 # Scheduled Services
/ConnectionsAdmin               # Data Connections
/ConnectionQueryAdmin?CcID=00000001-0000-0000-0000-c0000000f002  # Data Connection Queries (form DB)
/ModuleAdmin                    # Module Library

# Admin Tools
/UserAdmin                      # Users
/GroupAdmin                     # Groups
/VisualVaultAdmin?SecurityType=PortalAdmin  # Portals
/MenuAdmin                      # Menus
/DropDownListAdmin              # Dropdown Lists
/EmailTemplateAdmin             # Email Templates
/siteadmin?SecurityType=Location    # Site Admin: Locations
/siteadmin?SecurityType=Customer    # Site Admin: Customers
/SiteAdmin?SecurityType=Supplier    # Site Admin: Suppliers

# User
/UserProfile                    # My Preferences
/ControlPanel                   # Control Panel
/AdvancedSearch?newsearch=true  # Advanced Search
/UserSearches                   # Saved Searches
```

Separate apps (different URL roots):

```
# FormViewer (Angular SPA)
https://vvdemo.visualvault.com/FormViewer/app?hidemenu=true&formid=...&xcid=...&xcdid=...

# Process Design Studio (token-authenticated)
https://vvdemo.visualvault.com/ProcessDesignStudio?access_token=...

# Offline Forms (AngularJS SPA)
https://vvdemo.visualvault.com/OfflineForms/index.html#!/land?xcid=...&xcdid=...
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

### Document Index Field Date Handling

Document index fields (fieldType 4, "Date Time") behave differently from form calendar fields. Verified 2026-04-09 on vvdemo.

| Behavior                    | Form Fields (`postForms`)                 | Document Index Fields (`putDocumentIndexFields`) |
| --------------------------- | ----------------------------------------- | ------------------------------------------------ |
| Date-only input             | Stored as-is                              | Normalized to `T00:00:00` (no Z)                 |
| API response Z suffix       | Always `Z` (e.g., `2026-03-15T00:00:00Z`) | **Never** — no Z in response                     |
| Timezone offset input       | Stored as-is (no conversion)              | **Converted to UTC**, Z stripped                 |
| EU date format (DD/MM/YYYY) | Silently swapped (WS-BUG-2)               | **Correctly parsed**                             |
| Clearing a value            | Sets to null                              | **Cannot clear** — silent failure                |
| Configuration flags         | enableTime, ignoreTimezone, useLegacy     | None — single "Date Time" type                   |

Key behaviors:

- **Naive datetimes preserved**: `2026-03-15T14:30:00` → stored and returned as `2026-03-15T14:30:00`
- **Timezone offsets silently resolved**: `2026-03-15T14:30:00-03:00` → stored as `2026-03-15T17:30:00` (UTC, Z stripped) — creates timezone-ambiguous values (DOC-BUG-1)
- **UI control**: Telerik RadDateTimePicker, displays in US 12h format (`3/15/2026 2:30 PM`)
- **Checkout required for UI editing**: datepicker is disabled when document is checked in; API can always write regardless
- **Built-in document dates** (`createDate`, `modifyDate`, `reviewDate`, `expireDate`) include Z suffix; index field dates do not — inconsistent within the same document

See `tasks/date-handling/document-library/analysis/overview.md` for full investigation and `testing/specs/date-handling/doc-index-field-dates.spec.js` for 17 automated regression tests.

### Auto-Save

The FormViewer localization keys include auto-save strings (`autoSave`, `autoSaveToggle`, `autoSaveInterval`), but **no auto-save implementation exists in the platform**. The save pipeline is always manual (Save button click). `DebouncedSave()` in the form script library calls `window.debouncedSave()` which is customer-injected JavaScript, not platform code. Verified 2026-04-09 by searching the full codebase and localization APIs.

---

## REST API Resources

Discovered via `GET /api/v1/{customer}/{db}/{resource}` on vvdemo, 2026-04-09. All require OAuth bearer token.

### Accessible Resources (200)

| Resource            | Items  | Notes                                                                           |
| ------------------- | ------ | ------------------------------------------------------------------------------- |
| `/users`            | 19     | User accounts                                                                   |
| `/groups`           | 5      | Security groups                                                                 |
| `/sites`            | 1      | Site/location hierarchy (default: "Home")                                       |
| `/formtemplates`    | 89     | Form template definitions                                                       |
| `/documents`        | 145    | Document records                                                                |
| `/folders`          | ?      | Folder hierarchy                                                                |
| `/outsideprocesses` | 43     | Registered microservices                                                        |
| `/customquery`      | ?      | Named SQL queries                                                               |
| `/scripts`          | ?      | Script resources                                                                |
| `/reports`          | 1      | Report definitions                                                              |
| `/configuration`    | object | Service configuration (see [Configuration Discovery](#configuration-discovery)) |
| `/version`          | object | Platform version info (see [Version API Endpoint](#version-api-endpoint))       |
| `/meta`             | object | Lists all 91 data types (entity/control names) in the platform schema           |
| `/indexfields`      | 6      | Document index field definitions                                                |
| `/securitymembers`  | ?      | Security membership records                                                     |
| `/files`            | ?      | File resources                                                                  |
| `/dashboards`       | 0      | Dashboard definitions (empty on demo)                                           |

### Method-Restricted Resources (405)

| Resource     | Status | Notes                                                                      |
| ------------ | ------ | -------------------------------------------------------------------------- |
| `/forms`     | 405    | Exists but GET not supported — must access via `/formtemplates/{id}/forms` |
| `/customers` | 405    | Exists but GET not supported                                               |

### Not Found (404)

These do not exist as top-level REST resources: `documenttemplates`, `scheduledProcess`, `email`, `projects`, `schema`, `notifications`, `workflow`, `workflowinstances`, `processes`, `library`, `databases`, `roles`, `permissions`, `apiapplications`, `dropdownlists`, `menus`, `portals`, `tags`, `audit`, `auditlog`, `sessions`, `tokens`, `search`, `fulltext`, `calendar`, `events`, `widgets`, `exports`, `imports`, `templates`, `revisions`, `histories`.

Note: `scheduledProcess` returns 404 at the top level but may be accessible as a sub-resource. Some of these (e.g., `email`, `projects`) are documented in the client library config.yml but may require different URL patterns.

### Undocumented Endpoints (discovered via FormViewer network intercept)

These endpoints are called by the FormViewer SPA during page load. They are not in the client library config.yml but work with OAuth bearer tokens.

| Method | Endpoint                                                  | Purpose                                                   |
| ------ | --------------------------------------------------------- | --------------------------------------------------------- |
| GET    | `/formdesigner/outsideprocesses`                          | Microservices filtered for form designer context          |
| GET    | `/Workflow/FormTemplate?name={name}`                      | Workflow configuration for a form template                |
| GET    | `/Workflow/GetTaskForUser?id={formTemplateId}`            | Workflow tasks assigned to current user for a form        |
| GET    | `/FormInstance/{templateDefId}/forms`                     | Form instances (alternate to `/formtemplates/{id}/forms`) |
| GET    | `/users/signatures`                                       | Current user's signature data                             |
| POST   | `/formentity/{templateDefId}/evaluateGroupsAndConditions` | Evaluate group visibility and conditions for a form       |

---

## Localization API

The platform provides a localization/i18n API at `/api/v1/resource/`. Used by FormViewer and the main app for UI string translation.

### Language List

```
GET /api/v1/resource/language
```

Returns all supported languages. As of 2026-04-09:

| Pkey | Language           | Code      |
| ---- | ------------------ | --------- |
| 1    | English            | `en-US`   |
| 2    | Portuguese         | `pt-BR`   |
| 3    | Simplified Chinese | `zh-HANS` |
| 4    | Spanish - Peru     | `es-PE`   |
| 5    | Spanish - Colombia | `es-CO`   |

### Localization Dictionaries

```
GET /api/v1/resource/localization?lang={lang}&area={area}
```

Returns key-value dictionary of UI strings for a given area.

| Area            | en-US Keys | Other Languages | Content                                                         |
| --------------- | ---------- | --------------- | --------------------------------------------------------------- |
| `Common`        | 561        | 554             | Shared strings: workflows, projects, security, documents, email |
| `NewFormViewer` | 497        | 442             | Full Angular FormViewer UI                                      |
| `FormViewer`    | 35         | —               | Legacy FormViewer (error messages only)                         |
| `UserProfile`   | 10         | —               | Culture, language, default customer, rows-per-page              |
| `ControlPanel`  | 1          | —               | Minimal                                                         |

Translation gap: en-US has 55 more `NewFormViewer` keys and 7 more `Common` keys than pt-BR/es-PE/es-CO/zh-HANS — untranslated features.

### Script Localization

```
GET /api/v1/resource/scriptLocalization?lang={lang}&templateId={templateRevisionId}&formChId={templateDefId}
```

Returns per-form-template script localizations. Requires both template IDs.

---

## FormViewer Feature Map

Derived from the 497 `NewFormViewer` localization keys. This represents the **complete feature set** of the current FormViewer Angular SPA. Verified 2026-04-09 on vvdemo.

| Feature Area               | Capabilities                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workflow**               | Complete task, route to users/groups, approve/reject, task due dates, assignments, return to originator/sequence/user, workflow history, continue/end workflow |
| **Documents**              | Archive, delete, download, email, share, upload files, related documents, recycle bin, ID card creation, document actions                                      |
| **Projects**               | Add/relate/modify related projects, project security, folder security, copy contents from project                                                              |
| **Offline Forms**          | Full offline workflow: download templates, sync forms/documents/data rows, online/offline login, refresh                                                       |
| **Signature**              | Canvas signature capture, profile signatures, password-protected stamps, save to profile                                                                       |
| **Export**                 | Excel, Word, XML, PDF, form dashboard export, page range selection                                                                                             |
| **Form Locking**           | Lock/unlock forms, request unlock, auto-unlock timer with countdown, keep locked, send message to lock holder                                                  |
| **Repeating Row Controls** | Data grids within forms, add/save/cancel rows, column properties (visibility in exports/prints)                                                                |
| **Barcode**                | Barcode generation, image types, validation                                                                                                                    |
| **Auto-Save**              | Toggle on/off, configurable interval in minutes                                                                                                                |
| **Batch Print**            | Print multiple forms, print preview                                                                                                                            |
| **Query Filters**          | Form field tokens, common tokens for dashboard filtering                                                                                                       |
| **Revisions**              | Change log, revision history                                                                                                                                   |
| **Related Forms**          | Assign/modify related forms between templates                                                                                                                  |
| **File Upload**            | Drag-and-drop, file type validation, max/min size, image dimension validation, ID card mode                                                                    |
| **Search**                 | Full text search (can be disabled), insert/delete rows                                                                                                         |
| **Stale Form Detection**   | "Save Anyway" option when form data has changed externally                                                                                                     |
| **Navigation**             | Multi-page forms with page navigation, goto page                                                                                                               |

---

## External Documentation

- Official docs: https://docs.visualvault.com/docs
